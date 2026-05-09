/* ===== 图谱渲染与交互 ===== */

let graphNodes = [], graphEdges = [];
let simulation, svg, g, link, linkLabel, node, nodeText;
let zoom;
let activeCategory = null;
let currentDetailNode = null;

const CATEGORIES = {
  "基础原理": { color: "#ef4444" },
  "核心概念": { color: "#f97316" },
  "结构元素": { color: "#3b82f6" },
  "走势类型": { color: "#22c55e" },
  "买卖点":   { color: "#eab308" },
  "定理系统": { color: "#6366f1" },
  "操作方法": { color: "#a855f7" },
  "风险管理": { color: "#ec4899" },
  "级别体系": { color: "#14b8a6" },
  "哲学思想": { color: "#8b5cf6" },
  "三维统一": { color: "#06b6d4" },
};

// 概念元数据：难度(diff)、前置知识(prereq)、后续学习(next)、关联课程(course)
const CONCEPT_META = {
  "K线包含关系": { diff:"beginner", prereq:[], next:["顶分型","底分型"], course:"第08课" },
  "顶分型": { diff:"beginner", prereq:["K线包含关系"], next:["笔","中继分型","转折分型"], course:"第08课" },
  "底分型": { diff:"beginner", prereq:["K线包含关系"], next:["笔","中继分型","转折分型"], course:"第08课" },
  "中继分型": { diff:"intermediate", prereq:["顶分型","底分型"], next:[], course:"第08课" },
  "转折分型": { diff:"intermediate", prereq:["顶分型","底分型"], next:["笔"], course:"第08课" },
  "笔": { diff:"beginner", prereq:["顶分型","底分型"], next:["线段"], course:"第08课" },
  "线段": { diff:"beginner", prereq:["笔"], next:["中枢"], course:"第08课" },
  "级别": { diff:"beginner", prereq:["走势类型"], next:["中枢"], course:"第09课" },
  "中枢": { diff:"intermediate", prereq:["次级别","走势类型"], next:["中枢定理一","中枢定理二","中枢定理三","背驰","第三类买卖点"], course:"第09课" },
  "走势类型": { diff:"beginner", prereq:["中枢"], next:["趋势","盘整"], course:"第09课" },
  "趋势": { diff:"intermediate", prereq:["走势类型"], next:["趋势背驰"], course:"第09课" },
  "盘整": { diff:"intermediate", prereq:["走势类型"], next:["盘整背驰"], course:"第09课" },
  "次级别": { diff:"intermediate", prereq:["级别"], next:["中枢","递归函数"], course:"第09课" },
  "背驰": { diff:"intermediate", prereq:["中枢"], next:["趋势背驰","盘整背驰","第一类买卖点"], course:"第10课" },
  "趋势背驰": { diff:"advanced", prereq:["背驰","趋势"], next:["第一类买点","第一类卖点"], course:"第10课" },
  "盘整背驰": { diff:"advanced", prereq:["背驰","盘整"], next:["第二类买点","第二类卖点"], course:"第10课" },
  "第一类买点": { diff:"intermediate", prereq:["趋势背驰"], next:["第二类买点","买卖点完备性"], course:"第10课" },
  "第一类卖点": { diff:"intermediate", prereq:["趋势背驰"], next:["第二类卖点","买卖点完备性"], course:"第10课" },
  "第二类买点": { diff:"intermediate", prereq:["第一类买点"], next:["第三类买点","买卖点完备性"], course:"第10课" },
  "第二类卖点": { diff:"intermediate", prereq:["第一类卖点"], next:["第三类卖点","买卖点完备性"], course:"第10课" },
  "第三类买点": { diff:"advanced", prereq:["第二类买点","中枢"], next:["买卖点完备性"], course:"第10课" },
  "第三类卖点": { diff:"advanced", prereq:["第二类卖点","中枢"], next:["买卖点完备性"], course:"第10课" },
  "区间套": { diff:"advanced", prereq:["背驰","级别"], next:[], course:"第11课" },
  "同级别分解": { diff:"advanced", prereq:["走势分解"], next:["同级别分解操作"], course:"第04课" },
  "中阴阶段": { diff:"advanced", prereq:["走势类型","中枢"], next:["中阴结束"], course:"" },
  "递归函数": { diff:"advanced", prereq:["级别","走势类型"], next:["走势必完美"], course:"" },
  "走势分解": { diff:"advanced", prereq:["走势必完美"], next:["多义性","走势分解定理一"], course:"" },
  "多义性": { diff:"advanced", prereq:["走势分解","走势结合律"], next:[], course:"" },
  "走势结合律": { diff:"advanced", prereq:["走势分解"], next:["多义性"], course:"" },
  "三个独立程序": { diff:"intermediate", prereq:["买卖点完备性"], next:["机械化操作"], course:"" },
  "机械化操作": { diff:"intermediate", prereq:["三个独立程序","不预测只应对"], next:[], course:"第16课" },
  "不预测只应对": { diff:"beginner", prereq:[], next:["机械化操作","完全分类"], course:"第16课" },
  "完全分类": { diff:"beginner", prereq:[], next:["走势类型"], course:"第05课" },
  "走势终完美": { diff:"beginner", prereq:[], next:["走势必完美","技术分析基本原理一"], course:"第11课" },
  "走势必完美": { diff:"intermediate", prereq:["走势终完美"], next:["走势分解","递归函数"], course:"第02课" },
  "自同构性": { diff:"intermediate", prereq:[], next:["递归函数","级别"], course:"第01课" },
  "分型": { diff:"beginner", prereq:["K线包含关系"], next:["顶分型","底分型"], course:"第08课" },
  "趋势": { diff:"intermediate", prereq:["走势类型"], next:["趋势背驰"], course:"第09课" },
  "中枢": { diff:"intermediate", prereq:["次级别","走势类型"], next:["中枢定理一","中枢定理二","中枢定理三","背驰","第三类买卖点"], course:"第09课" },
  "背驰": { diff:"intermediate", prereq:["中枢"], next:["趋势背驰","盘整背驰","第一类买卖点"], course:"第10课" },
  "级别": { diff:"beginner", prereq:["走势类型"], next:["中枢"], course:"第09课" },
  "递归函数": { diff:"advanced", prereq:["级别","走势类型"], next:["走势必完美"], course:"" },
  "第三类买点": { diff:"advanced", prereq:["第二类买点","中枢"], next:["买卖点完备性"], course:"第10课" },
  "第三类卖点": { diff:"advanced", prereq:["第二类卖点","中枢"], next:["买卖点完备性"], course:"第10课" },
};

const w = () => document.getElementById("graph-panel").clientWidth;
const h = () => document.getElementById("graph-panel").clientHeight;

// ===== 初始化 =====
async function initGraph() {
  const [nodesRes, edgesRes] = await Promise.all([
    fetch("/api/graph/nodes").then(r => r.json()),
    fetch("/api/graph/edges").then(r => r.json()),
  ]);
  graphNodes = nodesRes;
  graphEdges = edgesRes;

  svg = d3.select("#graph").append("svg")
    .attr("width", "100%").attr("height", "100%");
  const defs = svg.append("defs");

  Object.entries(CATEGORIES).forEach(([cat, conf]) => {
    defs.append("marker")
      .attr("id", `arrow-${cat.replace(/[^a-z]/gi,'_')}`)
      .attr("viewBox", "0 -5 10 10").attr("refX", 20).attr("refY", 0)
      .attr("markerWidth", 5).attr("markerHeight", 5).attr("orient", "auto")
      .append("path").attr("d", "M0,-5L10,0L0,5")
      .attr("fill", conf.color).attr("opacity", 0.5);
    const filter = defs.append("filter")
      .attr("id", `glow-${cat.replace(/[^a-z]/gi,'_')}`)
      .attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "coloredBlur");
    const merge = filter.append("feMerge");
    merge.append("feMergeNode").attr("in", "coloredBlur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");
  });

  g = svg.append("g");
  zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", e => g.attr("transform", e.transform));
  svg.call(zoom);

  simulation = d3.forceSimulation(graphNodes)
    .force("link", d3.forceLink(graphEdges).id(d => d.id)
      .distance(d => {
        const imp = d.importance || 20;
        return (imp + 40) * (imp > 30 ? 3.0 : 2.2);
      }).strength(0.4))
    .force("charge", d3.forceManyBody().strength(d => -(d.importance||20) * 10))
    .force("center", d3.forceCenter(0, 0))
    .force("collision", d3.forceCollide().radius(d => (d.importance||20) + 8))
    .force("x", d3.forceX(0).strength(d => Math.max(0.01, 0.08 - (d.importance||20) / 500)))
    .force("y", d3.forceY(0).strength(d => Math.max(0.01, 0.08 - (d.importance||20) / 500)));

  link = g.append("g").selectAll("line").data(graphEdges).enter().append("line")
    .attr("class", "link")
    .attr("stroke", d => {
      const src = graphNodes.find(n => n.id === (d.source.id || d.source));
      return src ? (CATEGORIES[src.category]?.color || "#555") : "#555";
    })
    .attr("stroke-width", d => Math.max(0.5, (d.weight || 1) * 0.6))
    .attr("stroke-opacity", 0.3)
    .attr("marker-end", d => {
      const src = graphNodes.find(n => n.id === (d.source.id || d.source));
      return src ? `url(#arrow-${src.category.replace(/[^a-z]/gi,'_')})` : "";
    });

  linkLabel = g.append("g").selectAll("text").data(graphEdges).enter().append("text")
    .attr("fill", "#6e7681").attr("font-size", "8px").attr("text-anchor", "middle")
    .text(d => d.label).style("pointer-events", "none");

  node = g.append("g").selectAll("g").data(graphNodes).enter().append("g").attr("class", "node")
    .call(d3.drag()
      .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (e, d) => { d.fx = e.x; d.fy = d.y; })
      .on("end", (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

  node.append("circle")
    .attr("r", d => d.importance || 20)
    .attr("fill", d => { const c = CATEGORIES[d.category]?.color || "#888"; return d3.color(c).copy({opacity: 0.8}); })
    .attr("stroke", d => CATEGORIES[d.category]?.color || "#888").attr("stroke-width", 1.5)
    .attr("filter", d => `url(#glow-${d.category.replace(/[^a-z]/gi,'_')})`)
    .on("mouseover", (e, d) => { showTooltip(e, d); highlightNode(d); })
    .on("mousemove", e => { const tt = document.getElementById("tooltip"); tt.style.left = (e.pageX + 12) + "px"; tt.style.top = (e.pageY - 8) + "px"; })
    .on("mouseout", () => { hideTooltip(); resetHighlight(); })
    .on("click", (e, d) => { showNodeDetail(d); e.stopPropagation(); })
    .on("dblclick", (e, d) => { expandSubgraph(d); e.stopPropagation(); });

  nodeText = node.append("text")
    .attr("dy", d => (d.importance || 20) + 12).attr("text-anchor", "middle")
    .attr("fill", "#e6edf3")
    .attr("font-size", d => Math.min(11, Math.max(8, d.importance * 0.38)) + "px")
    .attr("font-weight", d => d.importance > 28 ? "600" : "400")
    .text(d => d.id);

  simulation.on("tick", () => {
    link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => { const dx = d.target.x-d.source.x, dy = d.target.y-d.source.y; const l = Math.sqrt(dx*dx+dy*dy)||1; return d.target.x-dx/l*((d.target.importance||20)+2); })
      .attr("y2", d => { const dx = d.target.x-d.source.x, dy = d.target.y-d.source.y; const l = Math.sqrt(dx*dx+dy*dy)||1; return d.target.y-dy/l*((d.target.importance||20)+2); });
    linkLabel.attr("x", d => (d.source.x+d.target.x)/2).attr("y", d => (d.source.y+d.target.y)/2 - 4);
    node.attr("transform", d => `translate(${d.x},${d.y})`);
  });

  setTimeout(() => {
    try {
      const bounds = g.node().getBBox();
      if (bounds.width === 0 || bounds.height === 0) return;
      const scale = Math.min(0.85, Math.min(w()/bounds.width, h()/bounds.height));
      const tx = w()/2 - scale*(bounds.x+bounds.width/2), ty = h()/2 - scale*(bounds.y+bounds.height/2);
      svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    } catch(e) { console.warn("Auto-zoom failed:", e); }
  }, 2000);

  buildLegend();
  loadSuggestions();
  renderLearnPath();
}

function showTooltip(e, d) {
  const tt = document.getElementById("tooltip");
  const shortDesc = d.description ? d.description.slice(0, 80) + "..." : "";
  tt.innerHTML = `<strong style="color:${CATEGORIES[d.category]?.color}">${d.id}</strong><br><span style="color:#8b949e;font-size:10px">${d.category}</span><br><span style="font-size:11px">${shortDesc}</span>`;
  tt.style.display = "block";
}
function hideTooltip() { document.getElementById("tooltip").style.display = "none"; }

function highlightNode(d) {
  const connected = new Set([d.id]);
  graphEdges.forEach(e => { const s = e.source.id||e.source, t = e.target.id||e.target; if(s===d.id) connected.add(t); if(t===d.id) connected.add(s); });
  node.selectAll("circle").attr("opacity", n => connected.has(n.id) ? 1 : 0.12).attr("r", n => n.id===d.id ? (n.importance||20)*1.3 : (n.importance||20));
  link.attr("stroke-opacity", e => { const s=e.source.id||e.source, t=e.target.id||e.target; return (s===d.id||t===d.id)?0.8:0.03; });
  nodeText.attr("opacity", n => connected.has(n.id) ? 1 : 0.15);
  linkLabel.attr("opacity", e => { const s=e.source.id||e.source, t=e.target.id||e.target; return (s===d.id||t===d.id)?1:0.03; });
}

function resetHighlight() {
  node.selectAll("circle").attr("opacity", 1).attr("r", d => d.importance||20);
  link.attr("stroke-opacity", 0.3);
  nodeText.attr("opacity", 1);
  linkLabel.attr("opacity", 1);
}

async function showNodeDetail(d) {
  currentDetailNode = d.id;
  document.getElementById("placeholder").style.display = "none";
  const panel = document.getElementById("node-detail");
  panel.style.display = "flex";
  document.getElementById("d-name").textContent = d.id;
  document.getElementById("d-name").style.color = CATEGORIES[d.category]?.color || "#e6edf3";
  const catEl = document.getElementById("d-category");
  catEl.textContent = d.category;
  const color = CATEGORIES[d.category]?.color || "#888";
  catEl.style.background = color + "22"; catEl.style.color = color; catEl.style.border = `1px solid ${color}44`;
  document.getElementById("d-desc").textContent = d.description || "暂无描述";
  // 难度标签
  const meta = CONCEPT_META[d.id] || {};
  const diffEl = document.getElementById("d-difficulty");
  const diffMap = { "beginner": "入门", "intermediate": "进阶", "advanced": "高阶" };
  if (meta.diff) {
    diffEl.textContent = diffMap[meta.diff] || "";
    diffEl.className = "diff-badge diff-" + meta.diff;
    diffEl.style.display = "inline-block";
  } else {
    diffEl.style.display = "none";
  }
  // 前置知识
  renderKnowledgeLinks("d-prerequisites", "d-prereq-section", meta.prereq);
  // 后续学习
  renderKnowledgeLinks("d-next", "d-next-section", meta.next);
  // 配图（从 localStorage 加载保存的图片路径）
  const imgSection = document.getElementById("d-image-section");
  const imgEl = document.getElementById("d-image");
  const placeholder = document.getElementById("d-image-placeholder");
  const removeBtn = document.getElementById("d-image-remove");
  const savedImg = localStorage.getItem("img_" + d.id);
  if (savedImg) {
    imgSection.style.display = "block";
    imgEl.src = savedImg;
    imgEl.style.display = "block";
    placeholder.style.display = "none";
    removeBtn.style.display = "block";
  } else {
    imgSection.style.display = "block";
    imgEl.style.display = "none";
    placeholder.style.display = "block";
    removeBtn.style.display = "none";
  }
  try {
    const detail = await (await fetch(`/api/graph/node/${encodeURIComponent(d.id)}`)).json();
    const relatedDiv = document.getElementById("d-related");
    relatedDiv.innerHTML = "";
    if (detail && detail.neighbors) {
      detail.neighbors.forEach(nb => {
        const chip = document.createElement("span");
        chip.className = "related-chip";
        chip.textContent = `${nb.direction==="outgoing"?"→":"←"} ${nb.id} (${nb.label})`;
        const c = CATEGORIES[nb.category]?.color || "#888";
        chip.style.borderColor = c+"66"; chip.style.color = c; chip.style.background = c+"11";
        chip.onclick = () => {
          const target = graphNodes.find(n => n.id === nb.id);
          if (target) { showNodeDetail(target); highlightNode(target); svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity.translate(w()/2-target.x, h()/2-target.y).scale(1.3)); }
        };
        relatedDiv.appendChild(chip);
      });
    }
  } catch(e) { 
    console.error(e);
    document.getElementById("d-related").innerHTML = '<span style="color:#888;font-size:12px;">暂无关联概念</span>';
  }
  switchTab("detail");
}

function renderKnowledgeLinks(containerId, sectionId, items) {
  const container = document.getElementById(containerId);
  const section = document.getElementById(sectionId);
  if (!items || !items.length) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  container.innerHTML = "";
  items.forEach(name => {
    const link = document.createElement("span");
    link.className = "knowledge-link";
    link.textContent = name;
    link.onclick = () => {
      const target = graphNodes.find(n => n.id === name);
      if (target) {
        currentDetailNode = name;
        const el = document.getElementById("d-name");
        if (el) showNodeDetail(target);
      }
    };
    container.appendChild(link);
  });
}

function buildLegend() {
  const legend = document.getElementById("legend");
  // 全选/全不选按钮
  const toggleAll = document.createElement("div");
  toggleAll.className = "legend-toggle";
  toggleAll.innerHTML = '<span class="legend-toggle-btn" id="legendToggleAll">☐ 全选</span>';
  legend.appendChild(toggleAll);
  document.getElementById("legendToggleAll").onclick = () => {
    const allActive = document.querySelectorAll(".legend-item.active").length === Object.keys(CATEGORIES).length;
    document.querySelectorAll(".legend-item").forEach(el => el.classList.toggle("active", !allActive));
    applyFilter();
    document.getElementById("legendToggleAll").textContent = allActive ? '☐ 全选' : '☑ 全不选';
  };

  Object.entries(CATEGORIES).forEach(([cat, conf]) => {
    const item = document.createElement("div");
    item.className = "legend-item active";
    item.innerHTML = `<span class="legend-dot" style="background:${conf.color}"></span><span>${cat}</span>`;
    item.onclick = () => {
      item.classList.toggle("active");
      applyFilter();
      // 更新全选按钮文案
      const allActive = document.querySelectorAll(".legend-item.active").length === Object.keys(CATEGORIES).length;
      document.getElementById("legendToggleAll").textContent = allActive ? '☐ 全选' : '☑ 全不选';
    };
    legend.appendChild(item);
  });
}

function applyFilter() {
  const activeCats = new Set();
  document.querySelectorAll(".legend-item.active").forEach(el => activeCats.add(el.textContent.trim()));
  const hasAll = activeCats.size === Object.keys(CATEGORIES).length;
  node.selectAll("circle").attr("opacity", n => hasAll || activeCats.has(n.category) ? 1 : 0.06);
  nodeText.attr("opacity", n => hasAll || activeCats.has(n.category) ? 1 : 0.06);
  link.attr("stroke-opacity", e => {
    if (hasAll) return 0.3;
    const s = graphNodes.find(n => n.id === (e.source.id || e.source));
    return s && activeCats.has(s.category) ? 0.6 : 0.02;
  });
  linkLabel.attr("opacity", e => {
    if (hasAll) return 1;
    const s = graphNodes.find(n => n.id === (e.source.id || e.source));
    return s && activeCats.has(s.category) ? 1 : 0.02;
  });
}

function resetView() {
  // 重置筛选
  document.querySelectorAll(".legend-item").forEach(el => el.classList.add("active"));
  applyFilter();
  document.getElementById("legendToggleAll").textContent = '☐ 全选';
  // 移除脉冲圈
  g.selectAll(".pulse-ring").remove();
  // 恢复透明度
  node.selectAll("circle").attr("r", d => d.importance||20);
  setTimeout(() => {
    try {
      const bounds = g.node().getBBox();
      if (bounds.width === 0 || bounds.height === 0) return;
      const scale = Math.min(0.85, Math.min(w()/bounds.width, h()/bounds.height));
      svg.transition().duration(800).call(zoom.transform, d3.zoomIdentity.translate(w()/2-scale*(bounds.x+bounds.width/2), h()/2-scale*(bounds.y+bounds.height/2)).scale(scale));
    } catch(e) { console.warn("Reset zoom failed:", e); }
  }, 100);
}

// ===== 热更新图表 =====
async function reloadGraph() {
  try {
    const [nodesRes, edgesRes] = await Promise.all([
      fetch("/api/graph/nodes").then(r => r.json()),
      fetch("/api/graph/edges").then(r => r.json()),
    ]);
    graphNodes = nodesRes;
    graphEdges = edgesRes;
    // 重建边线
    link = link.data(graphEdges);
    link.exit().remove();
    link = link.enter().append("line").attr("class", "link")
      .attr("stroke", e => {
        const src = graphNodes.find(n => n.id === (e.source.id || e.source));
        return src ? (CATEGORIES[src.category]?.color || "#555") : "#555";
      })
      .attr("stroke-width", e => Math.max(0.5, (e.weight || 1) * 0.6))
      .attr("stroke-opacity", 0.3)
      .attr("marker-end", e => {
        const src = graphNodes.find(n => n.id === (e.source.id || e.source));
        return src ? `url(#arrow-${src.category.replace(/[^a-z]/gi,'_')})` : "";
      })
      .merge(link);

    // 重建边标签
    linkLabel.remove();
    linkLabel = g.append("g").selectAll("text").data(graphEdges).enter().append("text")
      .attr("fill", "#6e7681").attr("font-size", "8px").attr("text-anchor", "middle")
      .text(d => d.label).style("pointer-events", "none");

    // 重建节点
    node.remove();
    node = g.append("g").selectAll("g").data(graphNodes).enter().append("g").attr("class", "node");

    // 拖拽
    node.call(d3.drag()
      .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on("end", (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    node.append("circle")
      .attr("r", d => {
        const base = d.importance || 20;
        return base > 35 ? base * 1.1 : base;
      })
      .attr("fill", d => {
        const c = CATEGORIES[d.category]?.color || "#888";
        // 重要性越高饱和度越高
        const imp = d.importance || 20;
        const sat = Math.min(1, 0.5 + imp / 60);
        return d3.color(c).copy({opacity: Math.max(0.5, sat)});
      })
      .attr("stroke", d => CATEGORIES[d.category]?.color || "#888").attr("stroke-width", 1.5)
      .attr("filter", d => `url(#glow-${(d.category||'').replace(/[^a-z]/gi,'_')})`)
      .on("mouseover", (e, d) => { showTooltip(e, d); highlightNode(d); })
      .on("mousemove", e => { const tt = document.getElementById("tooltip"); tt.style.left = (e.pageX + 12) + "px"; tt.style.top = (e.pageY - 8) + "px"; })
      .on("mouseout", () => { hideTooltip(); resetHighlight(); })
      .on("click", (e, d) => { showNodeDetail(d); e.stopPropagation(); })
      .on("dblclick", (e, d) => { expandSubgraph(d); e.stopPropagation(); });

    nodeText = node.append("text")
      .attr("dy", d => (d.importance || 20) + 12).attr("text-anchor", "middle")
      .attr("fill", "#e6edf3")
      .attr("font-size", d => Math.min(11, Math.max(8, d.importance * 0.38)) + "px")
      .text(d => d.id);

    // 重启仿真
    simulation.nodes(graphNodes);
    simulation.force("link").links(graphEdges);
    simulation.alpha(0.5).restart();
  } catch(e) { console.error("reloadGraph failed:", e); }
}

// ===== Search =====
const searchInput = document.getElementById("searchInput");
const searchDropdown = document.getElementById("searchResults");
searchInput.addEventListener("input", async () => {
  const q = searchInput.value.trim();
  if (!q) { searchDropdown.classList.remove("show"); return; }
  try {
    const results = await (await fetch(`/api/graph/search?q=${encodeURIComponent(q)}`)).json();
    if (!results.length) { searchDropdown.classList.remove("show"); return; }
    searchDropdown.innerHTML = results.map(r => `<div class="search-item" onclick="focusNode('${r.id.replace(/'/g,"\\'")}')">${r.id} <span class="cat">${r.category}</span></div>`).join("");
    searchDropdown.classList.add("show");
  } catch(e) {}
});
searchInput.addEventListener("blur", () => { setTimeout(() => searchDropdown.classList.remove("show"), 200); });

function focusNode(nodeId) {
  searchDropdown.classList.remove("show"); searchInput.value = nodeId;
  const target = graphNodes.find(n => n.id === nodeId);
  if (target) {
    showNodeDetail(target);
    highlightNode(target);
    // 添加呼吸光晕
    addPulseRing(target);
    svg.transition().duration(600).call(zoom.transform,
      d3.zoomIdentity.translate(w()/2-target.x, h()/2-target.y).scale(1.5));
  }
}

// 呼吸光晕动画
function addPulseRing(d) {
  // 移除旧 ring
  g.selectAll(".pulse-ring").remove();
  const color = CATEGORIES[d.category]?.color || "#888";
  const ring = g.append("circle")
    .attr("class", "pulse-ring")
    .attr("r", (d.importance||20) + 4)
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", 3)
    .attr("opacity", 0.8)
    .attr("transform", `translate(${d.x},${d.y})`);
  function pulse() {
    ring.transition().duration(1000)
      .attr("r", (d.importance||20) + 16)
      .attr("opacity", 0)
      .transition().duration(1000)
      .attr("r", (d.importance||20) + 4)
      .attr("opacity", 0.8)
      .on("end", pulse);
  }
  pulse();
  // 鼠标移入详情面板或图时自动移除
  setTimeout(() => { g.selectAll(".pulse-ring").remove(); }, 6000);
}

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tabName));
  document.querySelectorAll(".tab-content").forEach(t => t.classList.toggle("active", t.id === `tab-${tabName}`));
}

// ===== Path =====
async function findPath() {
  const source = document.getElementById("pathSource").value.trim();
  const target = document.getElementById("pathTarget").value.trim();
  if (!source || !target) return;
  const resultDiv = document.getElementById("pathResult");
  resultDiv.innerHTML = '<div class="loading"><div class="dot"></div><div class="dot"></div><div class="dot"></div> 查找路径中...</div>';
  try {
    const path = await (await fetch(`/api/graph/path?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`)).json();
    if (!path.length) { resultDiv.innerHTML = "<p style='color:var(--text-muted)'>未找到连接路径。</p>"; return; }
    let html = "";
    path.forEach(p => { html += `<span class="path-node" onclick="focusNode('${p.source.replace(/'/g,"\\'")}')" style="cursor:pointer">${p.source}</span><span class="path-arrow">→ ${p.label} →</span>`; });
    html += `<span class="path-node" onclick="focusNode('${path[path.length-1].target.replace(/'/g,"\\'")}')" style="cursor:pointer">${path[path.length-1].target}</span>`;
    resultDiv.innerHTML = html;
    // 在图上看得到高亮路径
    highlightPathOnGraph(path);
  } catch(e) { resultDiv.innerHTML = "<p style='color:#ef4444'>查询失败</p>"; }
}

// 在图上看得到高亮路径动画
function highlightPathOnGraph(path) {
  // 收集路径上的节点ID
  const pathNodeIds = new Set();
  path.forEach(p => { pathNodeIds.add(p.source); pathNodeIds.add(p.target); });
  // 重置高亮先
  resetHighlight();
  // 路径节点放大 + 变色呼吸
  node.selectAll("circle")
    .attr("opacity", n => pathNodeIds.has(n.id) ? 1 : 0.08)
    .attr("r", n => pathNodeIds.has(n.id) ? (n.importance||20) * 1.4 : (n.importance||20));
  nodeText.attr("opacity", n => pathNodeIds.has(n.id) ? 1 : 0.1);
  // 路径边高亮（虚线流动效果）
  link.attr("stroke-opacity", e => {
    const s = e.source.id||e.source, t = e.target.id||e.target;
    return pathNodeIds.has(s) && pathNodeIds.has(t) ? 1 : 0.03;
  }).attr("stroke-width", e => {
    const s = e.source.id||e.source, t = e.target.id||e.target;
    return pathNodeIds.has(s) && pathNodeIds.has(t) ? 3 : Math.max(0.5, (e.weight||1)*0.6);
  }).attr("stroke-dasharray", e => {
    const s = e.source.id||e.source, t = e.target.id||e.target;
    return pathNodeIds.has(s) && pathNodeIds.has(t) ? "6,4" : "none";
  });
  linkLabel.attr("opacity", e => {
    const s = e.source.id||e.source, t = e.target.id||e.target;
    return pathNodeIds.has(s) && pathNodeIds.has(t) ? 1 : 0.03;
  });
  // 加脉冲圈到所有路径节点
  pathNodeIds.forEach(id => {
    const n = graphNodes.find(x => x.id === id);
    if (n) addPulseRing(n);
  });
}

// ===== Suggestions =====
async function loadSuggestions(nodeId) {
  try {
    const suggestions = await (await fetch(`/api/rag/suggestions${nodeId ? '?node_id='+encodeURIComponent(nodeId) : ''}`)).json();
    const sugDiv = document.getElementById("suggestions");
    if (sugDiv) sugDiv.innerHTML = suggestions.slice(0, 5).map(s => `<button class="suggestion-btn" onclick="askSuggestion('${s.replace(/'/g, "\\'")}')">${s}</button>`).join("");
    const chatSug = document.getElementById("chatSuggestions");
    if (chatSug) chatSug.innerHTML = suggestions.slice(0, 4).map(s => `<button class="suggestion-btn" onclick="askSuggestion('${s.replace(/'/g, "\\'")}')">${s}</button>`).join("");
  } catch(e) {}
}

function askSuggestion(q) { switchTab("detail"); }

// ===== 缩放控件 =====
function zoomIn() {
  svg.transition().duration(400).call(zoom.scaleBy, 1.3);
}
function zoomOut() {
  svg.transition().duration(400).call(zoom.scaleBy, 1/1.3);
}

// 模式切换已改为独立页面 chart.html

// ===== 子图展开/收起 =====
const _expandedNodes = new Set();

async function expandSubgraph(d) {
  if (_expandedNodes.has(d.id)) {
    // 已展开则收起
    _expandedNodes.delete(d.id);
    // 恢复节点样式
    const sel = node.filter(n => n.id === d.id);
    sel.select("circle").attr("opacity", 1);
    return;
  }
  _expandedNodes.add(d.id);
  try {
    const sub = await (await fetch(`/api/graph/subgraph?node_id=${encodeURIComponent(d.id)}&depth=1`)).json();
    if (!sub || !sub.nodes) return;
    // 找出不在当前图中的新节点
    const existingIds = new Set(graphNodes.map(n => n.id));
    const newNodes = sub.nodes.filter(n => !existingIds.has(n.id));
    if (!newNodes.length && sub.nodes.length <= 1) return;
    // 也要找新边
    const existingEdgeKeys = new Set(graphEdges.map(e => `${e.source.id||e.source}-${e.target.id||e.target}`));
    sub.edges = sub.edges || sub.relationships || [];
    const newEdges = sub.edges.filter(e => !existingEdgeKeys.has(`${e.source.id||e.source}-${e.target.id||e.target}`));
    if (!newNodes.length && !newEdges.length) return;

    // 加入现有数据
    const addedNodes = [];
    newNodes.forEach(n => {
      if (!n.x) { n.x = d.x + (Math.random()-0.5)*100; n.y = d.y + (Math.random()-0.5)*100; }
      graphNodes.push(n);
      addedNodes.push(n);
    });
    newEdges.forEach(e => {
      const sId = e.source.id || e.source;
      const tId = e.target.id || e.target;
      graphEdges.push({source: sId, target: tId, label: e.label||"", weight: e.weight||1});
    });

    // 重建 D3 数据绑定
    link = link.data(graphEdges);
    link.exit().remove();
    link = link.enter().append("line").attr("class", "link").merge(link);

    // 新节点加为 g
    const newNodeG = g.append("g").selectAll("g").data(addedNodes).enter().append("g").attr("class", "node");
    newNodeG.append("circle")
      .attr("r", nd => nd.importance || 20)
      .attr("fill", nd => { const c = CATEGORIES[nd.category]?.color||"#888"; return d3.color(c).copy({opacity:0.8}); })
      .attr("stroke", nd => CATEGORIES[nd.category]?.color||"#888").attr("stroke-width", 1.5)
      .attr("filter", nd => `url(#glow-${(nd.category||'').replace(/[^a-z]/gi,'_')})`)
      .on("mouseover", (e, nd) => { showTooltip(e, nd); highlightNode(nd); })
      .on("mousemove", e => { const tt = document.getElementById("tooltip"); tt.style.left=(e.pageX+12)+"px"; tt.style.top=(e.pageY-8)+"px"; })
      .on("mouseout", () => { hideTooltip(); resetHighlight(); })
      .on("click", (e, nd) => { showNodeDetail(nd); e.stopPropagation(); })
      .on("dblclick", (e, nd) => { expandSubgraph(nd); e.stopPropagation(); });
    newNodeG.append("text")
      .attr("dy", nd => (nd.importance||20)+12).attr("text-anchor", "middle")
      .attr("fill", "#e6edf3")
      .attr("font-size", nd => Math.min(11, Math.max(8, nd.importance*0.38))+"px")
      .text(nd => nd.id);

    // 合并 node/text 选择集
    node = g.selectAll("g.node");
    nodeText = node.select("text");
    // 更新 link 和 linkLabel
    link.attr("stroke", e => {
      const src = graphNodes.find(n=>n.id===(e.source.id||e.source));
      return src ? (CATEGORIES[src.category]?.color||"#555") : "#555";
    }).attr("stroke-width", e => Math.max(0.5, (e.weight||1)*0.6))
      .attr("stroke-opacity", 0.3);
    linkLabel = g.selectAll("g").selectAll("text").data(graphEdges).enter().append("text")
      .attr("fill","#6e7681").attr("font-size","8px").attr("text-anchor","middle")
      .text(e => e.label).style("pointer-events","none");

    // 重启仿真（包含新节点）
    simulation.nodes(graphNodes);
    simulation.force("link").links(graphEdges);
    simulation.alpha(0.5).restart();
  } catch(e) { console.error("expandSubgraph failed:", e); }
}

// ===== 图谱管理（前端页面） =====
async function adminCreateNode() {
  const id = document.getElementById('admin-node-id').value.trim();
  const category = document.getElementById('admin-node-cat').value;
  const description = document.getElementById('admin-node-desc').value.trim();
  const msg = document.getElementById('admin-node-msg');
  if (!id) { msg.textContent = '请输入节点名称'; return; }
  try {
    const res = await fetch('/api/admin/node', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({id, category, description, importance:10})
    });
    const data = await res.json();
    if (res.ok) {
      msg.textContent = '✅ 节点已创建';
      document.getElementById('admin-node-id').value = '';
      document.getElementById('admin-node-desc').value = '';
      reloadGraph();
    } else {
      msg.textContent = '❌ ' + (data.detail || '创建失败');
    }
  } catch(e) { msg.textContent = '❌ 请求失败: ' + e.message; }
}

async function adminDeleteNode() {
  const id = document.getElementById('admin-node-id').value.trim();
  const msg = document.getElementById('admin-node-msg');
  if (!id) { msg.textContent = '请输入要删除的节点名称'; return; }
  if (!confirm(`确定要删除节点「${id}」及其所有关系吗？`)) return;
  try {
    const res = await fetch(`/api/admin/node/${encodeURIComponent(id)}`, { method:'DELETE' });
    const data = await res.json();
    if (res.ok) {
      msg.textContent = '✅ 节点已删除';
      reloadGraph();
    } else {
      msg.textContent = '❌ ' + (data.detail || '删除失败');
    }
  } catch(e) { msg.textContent = '❌ 请求失败: ' + e.message; }
}

async function adminUpdateNode() {
  const id = document.getElementById('admin-node-id').value.trim();
  const desc = document.getElementById('admin-node-desc').value.trim();
  const cat = document.getElementById('admin-node-cat').value;
  const msg = document.getElementById('admin-node-msg');
  if (!id) { msg.textContent = '请输入节点名称'; return; }
  try {
    const res = await fetch(`/api/admin/node/${encodeURIComponent(id)}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({category: cat, description: desc})
    });
    const data = await res.json();
    if (res.ok) {
      msg.textContent = '✅ 节点已更新';
      reloadGraph();
    } else {
      msg.textContent = '❌ ' + (data.detail || '更新失败');
    }
  } catch(e) { msg.textContent = '❌ 请求失败: ' + e.message; }
}

async function adminCreateEdge() {
  const source = document.getElementById('admin-edge-source').value.trim();
  const target = document.getElementById('admin-edge-target').value.trim();
  const label = document.getElementById('admin-edge-label').value.trim();
  const msg = document.getElementById('admin-edge-msg');
  if (!source || !target || !label) { msg.textContent = '请填写完整的关系信息'; return; }
  try {
    const res = await fetch('/api/admin/edge', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({source, target, label, weight:1})
    });
    const data = await res.json();
    if (res.ok) {
      msg.textContent = '✅ 关系已创建';
      document.getElementById('admin-edge-source').value = '';
      document.getElementById('admin-edge-target').value = '';
      document.getElementById('admin-edge-label').value = '';
      reloadGraph();
    } else {
      msg.textContent = '❌ ' + (data.detail || '创建失败');
    }
  } catch(e) { msg.textContent = '❌ 请求失败: ' + e.message; }
}

async function adminDeleteEdge() {
  const source = document.getElementById('admin-edge-source').value.trim();
  const target = document.getElementById('admin-edge-target').value.trim();
  const msg = document.getElementById('admin-edge-msg');
  if (!source || !target) { msg.textContent = '请填写源节点和目标节点'; return; }
  if (!confirm(`确定要删除「${source} → ${target}」的关系吗？`)) return;
  try {
    const res = await fetch(`/api/admin/edge?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`, { method:'DELETE' });
    const data = await res.json();
    if (res.ok) {
      msg.textContent = '✅ 关系已删除';
      reloadGraph();
    } else {
      msg.textContent = '❌ ' + (data.detail || '删除失败');
    }
  } catch(e) { msg.textContent = '❌ 请求失败: ' + e.message; }
}

// 图片点击放大
function zoomImage(img) {
  if (img.style.cursor === "zoom-out") {
    img.style.maxWidth = "100%";
    img.style.cursor = "zoom-in";
  } else {
    img.style.maxWidth = "none";
    img.style.width = "auto";
    img.style.maxHeight = "400px";
    img.style.cursor = "zoom-out";
  }
}

// ===== 配图上传/删除（后端保存到 static/images） =====
async function uploadConceptImage(input) {
  const file = input.files[0];
  if (!file) return;
  const msg = document.getElementById("d-image-msg");
  const conceptName = currentDetailNode || document.getElementById("d-name").textContent;
  if (!conceptName) { msg.textContent = "请先选择一个概念"; return; }
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("concept", conceptName);
  
  try {
    msg.textContent = "上传中...";
    const res = await fetch("/api/upload/concept-image", { method: "POST", body: formData });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("img_" + conceptName, data.url);
      // 刷新显示
      const imgEl = document.getElementById("d-image");
      const placeholder = document.getElementById("d-image-placeholder");
      const removeBtn = document.getElementById("d-image-remove");
      imgEl.src = data.url + "?t=" + Date.now();
      imgEl.style.display = "block";
      placeholder.style.display = "none";
      removeBtn.style.display = "block";
      msg.textContent = "✅ 图例已保存";
    } else {
      msg.textContent = "❌ " + (data.detail || "上传失败");
    }
  } catch(e) {
    msg.textContent = "❌ " + e.message;
  }
  input.value = "";
}

async function removeConceptImage() {
  const conceptName = currentDetailNode || document.getElementById("d-name").textContent;
  const msg = document.getElementById("d-image-msg");
  if (!conceptName) return;
  
  try {
    await fetch(`/api/upload/concept-image?concept=${encodeURIComponent(conceptName)}`, { method: "DELETE" });
  } catch(e) {}
  
  localStorage.removeItem("img_" + conceptName);
  document.getElementById("d-image").style.display = "none";
  document.getElementById("d-image-placeholder").style.display = "block";
  document.getElementById("d-image-remove").style.display = "none";
  msg.textContent = "✅ 图例已移除";
}

// ===== 学习路径 =====
function renderLearnPath() {
  const container = document.getElementById("learn-path");
  if (!container) return;
  const levels = [
    { key:"beginner", label:"入门", icon:"🌱", color:"#3fb950" },
    { key:"intermediate", label:"进阶", icon:"🔥", color:"#d29922" },
    { key:"advanced", label:"高阶", icon:"⚡", color:"#f85149" },
  ];
  let html = "";
  levels.forEach(level => {
    const concepts = graphNodes.filter(n => {
      const m = CONCEPT_META[n.id];
      return m && m.diff === level.key;
    }).sort((a, b) => (CONCEPT_META[a.id]?.prereq?.length||0) - (CONCEPT_META[b.id]?.prereq?.length||0));
    if (!concepts.length) return;
    html += `<div class="learn-section">`;
    html += `<h3><span class="learn-level" style="background:${level.color}22;color:${level.color};border:1px solid ${level.color}44;">${level.icon} ${level.label}</span> ${concepts.length} 个概念</h3>`;
    html += `<div class="learn-grid">`;
    concepts.forEach(n => {
      const c = CATEGORIES[n.category]?.color || "#888";
      html += `<div class="learn-card" onclick="focusNode('${n.id.replace(/'/g,"\\'")}')">`;
      html += `<div class="learn-card-name">${n.id}</div>`;
      html += `<div class="learn-card-cat" style="color:${c}">${n.category}</div>`;
      const prereq = CONCEPT_META[n.id]?.prereq || [];
      if (prereq.length) html += `<div class="learn-card-diff">需要先了解: ${prereq.slice(0,3).join("、")}${prereq.length>3?"…":""}</div>`;
      html += `</div>`;
    });
    html += `</div></div>`;
  });
  container.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", initGraph);
