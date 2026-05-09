<p align="center">
  <img src="https://raw.githubusercontent.com/Zoran689/ZenGraph/main/frontend/static/images/ZenGraph.png" width="200" alt="ZenGraph">
</p>

<h1 align="center">ZenGraph — 缠论知识图谱</h1>

缠论（缠中说禅理论）知识图谱系统，支持概念检索、关系图谱可视化、学习路径规划。

## 功能

- **知识图谱可视化** — 基于 D3.js 的力导向图，展示缠论概念间的关系网络
- **概念检索** — 搜索缠论概念，高亮显示关联节点
- **概念详情** — 点击节点查看概念描述、关联关系、前置知识、后续学习
- **学习路径** — 从任意概念出发，推荐学习路线
- **路径查询** — 查询两个概念之间的最短关系路径
- **图谱管理** — 增删节点和关系（图谱管理 Tab）

## 技术栈

| 层 | 技术 |
|---|---|
| **后端** | Python 3.14+, FastAPI |
| **数据库** | Neo4j 图数据库 |
| **前端** | D3.js (力导向图), Marked (Markdown 渲染) |
| **向量** | sentence-transformers (paraphrase-multilingual-MiniLM-L12-v2) |

## 快速开始

### 1. 启动 Neo4j

```bash
docker run -d --name neo4j-chan \
  -p 7687:7687 -p 7474:7474 \
  -e NEO4J_AUTH=neo4j/chantheory2026 \
  neo4j:5-enterprise
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 启动后端

```bash
cd backend/api
python3 main.py
```

服务运行在 `http://localhost:8899`

### 4. 导入知识图谱数据

```bash
python3 backend/scripts/add_theorems.py
python3 backend/scripts/add_relations.py
python3 backend/scripts/add_missing_nodes.py
python3 backend/scripts/add_theorem_relations.py
```

### 5. 打开页面

浏览器访问 `http://localhost:8899`

## 配置

编辑 `backend/config.py`：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `HOST` | `0.0.0.0` | 服务监听地址 |
| `PORT` | 8899 | 服务端口 |
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j 连接地址 |
| `NEO4J_USER` | `neo4j` | Neo4j 用户名 |
| `NEO4J_PASSWORD` | `chantheory2026` | Neo4j 密码 |

## 项目结构

```
chan-graph-rag/
├── backend/
│   ├── api/
│   │   └── main.py        # FastAPI 主入口
│   ├── config.py           # 全局配置
│   ├── models/
│   │   └── graph_data.py   # 数据模型
│   ├── services/
│   │   └── graph_service.py # 图谱服务层
│   └── scripts/            # 数据导入脚本
├── frontend/
│   ├── templates/
│   │   └── index.html      # 前端页面
│   └── static/
│       ├── css/style.css   # 样式
│       └── js/graph.js     # 图谱可视化逻辑
├── data/                   # 数据库文件
├── requirements.txt
└── README.md
```

## 许可证

MIT
