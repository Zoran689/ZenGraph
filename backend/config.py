"""全局配置"""
import os

# 项目根目录
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 数据目录
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
DB_PATH = os.path.join(DATA_DIR, "chan_knowledge.db")

# 文档源目录（缠论文档）
DOCS_DIR = "/Volumes/Zoran_SSD/ZenText"

# 教科书体例（唯一权威来源）
CHAN_DOCS = [
    "教科书体例_完整版.md",
]

# 服务配置
HOST = "0.0.0.0"
PORT = 8899

# Neo4j 配置
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "chantheory2026"
NEO4J_DATABASE = "neo4j"

# 向量模型
EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"

# 图谱颜色方案
CATEGORY_COLORS = {
    "基础原理": "#ef4444",
    "核心概念": "#f97316",
    "结构元素": "#3b82f6",
    "走势类型": "#22c55e",
    "买卖点": "#eab308",
    "定理系统": "#3b82f6",
    "操作方法": "#a855f7",
    "风险管理": "#ec4899",
    "级别体系": "#22c55e",
    "哲学思想": "#a855f7",
    "三维统一": "#06b6d4",
}
