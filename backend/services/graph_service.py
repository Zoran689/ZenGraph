"""图谱服务 - Neo4j + SQLite 实现（Neo4j 替代 NetworkX）"""
import json
import sqlite3
from neo4j import GraphDatabase
from typing import Optional
from backend.models.graph_data import CONCEPTS, RELATIONS
from backend.config import DB_PATH, CATEGORY_COLORS, NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, NEO4J_DATABASE


class GraphService:
    def __init__(self):
        # Neo4j 连接
        self._driver = GraphDatabase.driver(
            NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
        self._driver.verify_connectivity()
        print("[GraphService] Neo4j 连接成功")

        # SQLite 仍用于文档分块存储
        self.conn = sqlite3.connect(DB_PATH)
        self._init_db()

        # 初始化 Neo4j 约束 + 数据
        self._init_neo4j()
        self._build_graph()

    def _init_neo4j(self):
        """初始化 Neo4j 约束"""
        with self._driver.session(database=NEO4J_DATABASE) as session:
            # 创建唯一性约束
            session.run("""
                CREATE CONSTRAINT chan_concept_id IF NOT EXISTS
                FOR (c:Concept) REQUIRE c.id IS UNIQUE
            """)

    def _init_db(self):
        """初始化 SQLite 表结构（仅保留 document_chunks）"""
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS concepts (
                id TEXT PRIMARY KEY,
                category TEXT,
                importance INTEGER,
                description TEXT,
                aliases TEXT
            );
            CREATE TABLE IF NOT EXISTS relations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT,
                target TEXT,
                label TEXT,
                weight INTEGER
            );
            CREATE TABLE IF NOT EXISTS document_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_file TEXT,
                chunk_index INTEGER,
                content TEXT,
                embedding BLOB
            );
        """)
        self.conn.commit()

    def _build_graph(self):
        """从数据定义构建 Neo4j 图（幂等，重复运行不重复创建）"""
        with self._driver.session(database=NEO4J_DATABASE) as session:
            # 写入节点（MERGE 保证幂等）
            for c in CONCEPTS:
                session.run("""
                    MERGE (c:Concept {id: $id})
                    SET c.category = $category,
                        c.importance = $importance,
                        c.description = $description,
                        c.aliases = $aliases,
                        c.color = $color
                """, id=c["id"],
                     category=c["category"],
                     importance=c["importance"],
                     description=c["description"],
                     aliases=json.dumps(c.get("aliases", []), ensure_ascii=False),
                     color=CATEGORY_COLORS.get(c["category"], "#888"))

            # 写入关系（MERGE 保证幂等）
            for r in RELATIONS:
                session.run("""
                    MATCH (s:Concept {id: $source})
                    MATCH (t:Concept {id: $target})
                    MERGE (s)-[r:RELATES_TO]->(t)
                    SET r.label = $label, r.weight = $weight
                """, source=r["source"], target=r["target"],
                     label=r["label"], weight=r["weight"])

        print(f"[GraphService] Neo4j 图构建完成：{len(CONCEPTS)} 节点，{len(RELATIONS)} 关系")

    def persist(self):
        """同步数据到 SQLite（兼容旧逻辑）"""
        for c in CONCEPTS:
            self.conn.execute(
                "INSERT OR REPLACE INTO concepts VALUES (?,?,?,?,?)",
                (c["id"], c["category"], c["importance"], c["description"],
                 json.dumps(c.get("aliases", []), ensure_ascii=False))
            )
        for r in RELATIONS:
            self.conn.execute(
                "INSERT OR REPLACE INTO relations (source, target, label, weight) VALUES (?,?,?,?)",
                (r["source"], r["target"], r["label"], r["weight"])
            )
        self.conn.commit()

    def get_all_nodes(self) -> list:
        """获取所有节点（前端图谱用）"""
        with self._driver.session(database=NEO4J_DATABASE) as session:
            result = session.run("""
                MATCH (c:Concept)
                RETURN c.id AS id, c.category AS category, c.importance AS importance,
                       c.description AS description, c.aliases AS aliases, c.color AS color
            """)
            return [
                {
                    "id": r["id"], "category": r["category"],
                    "importance": r["importance"],
                    "description": r["description"],
                    "aliases": json.loads(r["aliases"] or "[]"),
                    "color": r["color"]
                }
                for r in result
            ]

    def get_all_edges(self) -> list:
        """获取所有边"""
        with self._driver.session(database=NEO4J_DATABASE) as session:
            result = session.run("""
                MATCH (s:Concept)-[r:RELATES_TO]->(t:Concept)
                RETURN s.id AS source, t.id AS target, r.label AS label, r.weight AS weight
            """)
            return [
                {"source": r["source"], "target": r["target"],
                 "label": r["label"], "weight": r["weight"]}
                for r in result
            ]

    def get_node_detail(self, node_id: str) -> Optional[dict]:
        """获取节点详情及其关联"""
        with self._driver.session(database=NEO4J_DATABASE) as session:
            # 查询节点本身
            node = session.run("""
                MATCH (c:Concept {id: $id})
                RETURN c.id AS id, c.category AS category, c.importance AS importance,
                       c.description AS description, c.aliases AS aliases, c.color AS color
            """, id=node_id).single()

            if not node:
                return None

            # 查询关联关系
            neighbors = []
            result = session.run("""
                MATCH (c:Concept {id: $id})-[r:RELATES_TO]->(t:Concept)
                RETURN t.id AS nid, t.category AS category, t.description AS description,
                       r.label AS label, 'outgoing' AS direction
                UNION
                MATCH (s:Concept)-[r:RELATES_TO]->(c:Concept {id: $id})
                RETURN s.id AS nid, s.category AS category, s.description AS description,
                       r.label AS label, 'incoming' AS direction
            """, id=node_id)

            for r in result:
                neighbors.append({
                    "id": r["nid"], "direction": r["direction"],
                    "label": r["label"], "category": r["category"],
                    "description": r["description"]
                })

            return {
                "id": node["id"], "category": node["category"],
                "importance": node["importance"],
                "description": node["description"],
                "aliases": json.loads(node["aliases"] or "[]"),
                "color": node["color"], "neighbors": neighbors
            }

    def search_nodes(self, query: str, limit: int = 10) -> list:
        """模糊搜索节点（Neo4j + jieba 分词）"""
        import jieba
        query_lower = query.lower()
        query_terms = [t for t in jieba.cut(query_lower) if len(t.strip()) > 0]

        # 在 Neo4j 中用 Cypher 搜索
        with self._driver.session(database=NEO4J_DATABASE) as session:
            result = session.run("""
                MATCH (c:Concept)
                RETURN c.id AS id, c.category AS category, c.importance AS importance,
                       c.description AS description, c.aliases AS aliases, c.color AS color
            """)

            results = []
            for r in result:
                aliases = json.loads(r["aliases"] or "[]")
                texts = [r["id"]] + aliases + [r["description"]]
                score = 0
                for t in texts:
                    if query_lower in t.lower():
                        score += 3
                for term in query_terms:
                    if len(term) < 2:
                        continue
                    for t in texts:
                        if term in t.lower():
                            score += 1
                if score > 0:
                    results.append({
                        "id": r["id"], "category": r["category"],
                        "importance": r["importance"],
                        "description": r["description"][:100],
                        "color": r["color"], "score": score
                    })

            results.sort(key=lambda x: (-x["score"], -x["importance"]))
            return results[:limit]

    def get_subgraph(self, node_id: str, depth: int = 1) -> dict:
        """获取以某节点为中心的子图"""
        with self._driver.session(database=NEO4J_DATABASE) as session:
            # 使用可变长度路径查询
            result = session.run("""
                MATCH (center:Concept {id: $id})
                CALL apoc.path.subgraphAll(center, {
                    maxLevel: $depth,
                    relationshipFilter: 'RELATES_TO>',
                    labelFilter: '+Concept'
                }) YIELD nodes, relationships
                RETURN nodes, relationships
            """, id=node_id, depth=depth)

            record = result.single()
            if not record:
                # apoc 不可用时的 fallback：逐步查询
                return self._get_subgraph_fallback(node_id, depth)

            node_ids = set()
            nodes = []
            for n in record["nodes"]:
                props = dict(n)
                nodes.append({
                    "id": props["id"], "category": props.get("category"),
                    "importance": props.get("importance"),
                    "description": props.get("description"),
                    "aliases": props.get("aliases"),
                    "color": props.get("color"),
                    "is_center": props["id"] == node_id
                })
                node_ids.add(props["id"])

            edges = []
            for rel in record["relationships"]:
                s_props = dict(rel.start_node)
                t_props = dict(rel.end_node)
                edges.append({
                    "source": s_props["id"], "target": t_props["id"],
                    "label": dict(rel).get("label"), "weight": dict(rel).get("weight")
                })

            return {"nodes": nodes, "edges": edges}

    def _get_subgraph_fallback(self, node_id: str, depth: int) -> dict:
        """无 APOC 插件时的子图查询 fallback"""
        with self._driver.session(database=NEO4J_DATABASE) as session:
            # 检查节点存在
            exists = session.run(
                "MATCH (c:Concept {id: $id}) RETURN c", id=node_id
            ).single()
            if not exists:
                return {"nodes": [], "edges": []}

            # BFS 收集节点
            visited = {node_id}
            frontier = [node_id]
            for _ in range(depth):
                if not frontier:
                    break
                nf = []
                for n in frontier:
                    result = session.run("""
                        MATCH (c:Concept {id: $id})-[r:RELATES_TO]-(neighbor:Concept)
                        RETURN DISTINCT neighbor.id AS nid
                    """, id=n)
                    for r in result:
                        if r["nid"] not in visited:
                            visited.add(r["nid"])
                            nf.append(r["nid"])
                frontier = nf

            # 查询所有节点和边
            nodes_result = session.run("""
                UNWIND $ids AS nid
                MATCH (c:Concept {id: nid})
                RETURN c.id AS id, c.category AS category, c.importance AS importance,
                       c.description AS description, c.aliases AS aliases,
                       c.color AS color
            """, ids=list(visited))

            nodes = []
            for r in nodes_result:
                nodes.append({
                    "id": r["id"], "category": r["category"],
                    "importance": r["importance"],
                    "description": r["description"],
                    "aliases": r["aliases"], "color": r["color"],
                    "is_center": r["id"] == node_id
                })

            edges_result = session.run("""
                UNWIND $ids AS nid
                MATCH (s:Concept)-[r:RELATES_TO]->(t:Concept)
                WHERE s.id IN $ids AND t.id IN $ids
                RETURN s.id AS source, t.id AS target, r.label AS label, r.weight AS weight
            """, ids=list(visited))

            edges = [{"source": r["source"], "target": r["target"],
                      "label": r["label"], "weight": r["weight"]} for r in edges_result]

            return {"nodes": nodes, "edges": edges}

    def get_paths(self, source: str, target: str) -> list:
        """查找两个概念之间的最短路径"""
        with self._driver.session(database=NEO4J_DATABASE) as session:
            result = session.run("""
                MATCH (s:Concept {id: $source}), (t:Concept {id: $target})
                MATCH p = shortestPath((s)-[:RELATES_TO*]-(t))
                RETURN [rel IN relationships(p) |
                    {source: startNode(rel).id, target: endNode(rel).id,
                     label: rel.label, weight: rel.weight}
                ] AS path
            """, source=source, target=target)

            record = result.single()
            if record and record["path"]:
                return record["path"]
            return []

    def get_stats(self) -> dict:
        """图谱统计"""
        with self._driver.session(database=NEO4J_DATABASE) as session:
            node_count = session.run("MATCH (c:Concept) RETURN count(c) AS cnt").single()["cnt"]
            edge_count = session.run("MATCH ()-[r:RELATES_TO]->() RETURN count(r) AS cnt").single()["cnt"]

            cat_result = session.run("""
                MATCH (c:Concept)
                RETURN c.category AS category, count(c) AS cnt
            """)
            categories = {r["category"]: r["cnt"] for r in cat_result}

            # 密度计算：density = 2 * E / (N * (N-1))  对于有向图
            if node_count > 1:
                density = (2 * edge_count) / (node_count * (node_count - 1))
            else:
                density = 0.0

            return {
                "total_nodes": node_count,
                "total_edges": edge_count,
                "categories": categories,
                "density": round(density, 4)
            }

    def get_context_for_rag(self, query: str, top_k: int = 5) -> list:
        """为 RAG 问答提供图谱上下文"""
        nodes = self.search_nodes(query, limit=top_k)
        context = []
        for n in nodes:
            detail = self.get_node_detail(n["id"])
            if detail:
                nb_text = ""
                for nb in detail["neighbors"][:3]:
                    sym = "→" if nb["direction"] == "outgoing" else "←"
                    nb_text += f"  {sym} {nb['label']} {nb['id']}\n"
                context.append(
                    f"## {detail['id']}（{detail['category']}）\n"
                    f"{detail['description']}\n关联概念：\n{nb_text}"
                )
        return context

    # ==================== CRUD 节点 ====================

    def create_node(self, id: str, category: str, description: str = "",
                    importance: int = 10, aliases: list = None,
                    color: str = "#888") -> dict:
        """创建节点"""
        color = color or CATEGORY_COLORS.get(category, "#888")
        with self._driver.session(database=NEO4J_DATABASE) as session:
            session.run(
                "MERGE (c:Concept {id: $id}) "
                "SET c.category = $category, c.description = $description, "
                "c.importance = $importance, c.aliases = $aliases, c.color = $color",
                id=id, category=category, description=description,
                importance=importance,
                aliases=json.dumps(aliases or [], ensure_ascii=False),
                color=color,
            )
        return {"id": id, "category": category, "description": description,
                "importance": importance, "aliases": aliases or [], "color": color}

    def update_node(self, id: str, **kwargs) -> bool:
        """更新节点属性，只更新传入的非 None 字段"""
        setters = []
        params = {"id": id}
        for key in ("category", "description", "importance", "color"):
            if key in kwargs and kwargs[key] is not None:
                setters.append(f"c.{key} = ${key}")
                params[key] = kwargs[key]
        if "aliases" in kwargs and kwargs["aliases"] is not None:
            setters.append("c.aliases = $aliases")
            params["aliases"] = json.dumps(kwargs["aliases"], ensure_ascii=False)
        if not setters:
            return False
        with self._driver.session(database=NEO4J_DATABASE) as session:
            result = session.run(
                f"MATCH (c:Concept {{id: $id}}) SET {', '.join(setters)} RETURN c.id",
                **params
            )
            return result.single() is not None

    def delete_node(self, id: str) -> bool:
        """删除节点及其所有关联关系"""
        with self._driver.session(database=NEO4J_DATABASE) as session:
            result = session.run(
                "MATCH (c:Concept {id: $id}) "
                "DETACH DELETE c "
                "RETURN count(c) AS deleted",
                id=id
            )
            record = result.single()
            return record and record["deleted"] > 0

    # ==================== CRUD 关系 ====================

    def create_edge(self, source_id: str, target_id: str,
                    label: str, weight: int = 1) -> dict:
        """创建关系"""
        with self._driver.session(database=NEO4J_DATABASE) as session:
            session.run(
                "MATCH (s:Concept {id: $source}), (t:Concept {id: $target}) "
                "MERGE (s)-[r:RELATES_TO {label: $label, weight: $weight}]->(t)",
                source=source_id, target=target_id, label=label, weight=weight
            )
        return {"source": source_id, "target": target_id,
                "label": label, "weight": weight}

    def get_edge(self, source_id: str, target_id: str) -> Optional[dict]:
        """查询单条关系详情"""
        with self._driver.session(database=NEO4J_DATABASE) as session:
            result = session.run(
                "MATCH (s:Concept {id: $source})-[r:RELATES_TO]->(t:Concept {id: $target}) "
                "RETURN r.label AS label, r.weight AS weight",
                source=source_id, target=target_id
            )
            record = result.single()
            if record:
                return {"source": source_id, "target": target_id,
                        "label": record["label"], "weight": record["weight"]}
            return None

    def update_edge(self, source_id: str, target_id: str,
                    label: str = None, weight: int = None) -> bool:
        """更新关系属性"""
        setters = []
        params = {"source": source_id, "target": target_id}
        if label is not None:
            setters.append("r.label = $label")
            params["label"] = label
        if weight is not None:
            setters.append("r.weight = $weight")
            params["weight"] = weight
        if not setters:
            return False
        with self._driver.session(database=NEO4J_DATABASE) as session:
            result = session.run(
                f"MATCH (s:Concept {{id: $source}})-[r:RELATES_TO]->(t:Concept {{id: $target}}) "
                f"SET {', '.join(setters)} RETURN r.weight",
                **params
            )
            return result.single() is not None

    def delete_edge(self, source_id: str, target_id: str) -> bool:
        """删除关系"""
        with self._driver.session(database=NEO4J_DATABASE) as session:
            result = session.run(
                "MATCH (s:Concept {id: $source})-[r:RELATES_TO]->(t:Concept {id: $target}) "
                "DELETE r RETURN count(r) AS deleted",
                source=source_id, target=target_id
            )
            record = result.single()
            return record and record["deleted"] > 0

    def close(self):
        """关闭连接"""
        if self.conn:
            self.conn.close()
        if self._driver:
            self._driver.close()
