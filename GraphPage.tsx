import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useActiveEvaluation } from '../context/ActiveEvaluationContext';
import { EvidenceGraph, GraphNode } from '../types';
import {
  Network, Eye, RefreshCw, AlertCircle, Layers,
  CheckCircle2, Sparkles, Filter, List, ArrowRight,
  Target, Info, BookOpen, Compass
} from 'lucide-react';

export const GraphPage: React.FC = () => {
  const { activeGapReportId, activeAnalysisId, targetTitle } = useActiveEvaluation();
  const [graph, setGraph] = useState<EvidenceGraph | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  const [error, setError] = useState<string | null>(null);

  const fetchGraph = async () => {
    setLoading(true);
    setError(null);
    try {
      let analysisId = activeAnalysisId;
      if (!analysisId) {
        const resumes = await api.listResumes();
        if (resumes.length > 0 && resumes[0].latest_analysis_id) {
          analysisId = resumes[0].latest_analysis_id;
        }
      }

      if (!analysisId) {
        setGraph(null);
        setLoading(false);
        return;
      }

      const data = await api.getEvidenceGraph(analysisId, activeGapReportId || undefined);
      setGraph(data);
      if (data.nodes.length > 0) {
        // Prefer candidate or target role node as default selection
        const defaultNode = data.nodes.find(n => n.type === 'job_role') ||
                            data.nodes.find(n => n.type === 'candidate') ||
                            data.nodes[0];
        setSelectedNode(defaultNode);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate evidence graph.');
      setGraph(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [activeGapReportId, activeAnalysisId]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'candidate': return '#10B981'; // Emerald
      case 'project': return '#8B5CF6';   // Purple
      case 'skill': return '#2563EB';     // Blue
      case 'job_role': return '#0F172A';  // Slate / Navy
      case 'gap': return '#EF4444';       // Red
      case 'learning': return '#D97706';  // Amber
      default: return '#64748B';
    }
  };

  // Deterministic 6-column layered layout with guaranteed collision-free vertical spacing
  const { positions, totalHeight, totalWidth } = useMemo(() => {
    const defaultRes = { positions: {} as Record<string, { x: number; y: number }>, totalHeight: 520, totalWidth: 1040 };
    if (!graph || graph.nodes.length === 0) return defaultRes;

    // Define 6 horizontal columns
    const columns: Record<string, number> = {
      candidate: 90,
      project: 260,
      skill: 440,
      job_role: 620,
      gap: 800,
      learning: 970,
    };

    // Group nodes into columns
    const columnNodes: Record<string, GraphNode[]> = {
      candidate: [],
      project: [],
      skill: [],
      job_role: [],
      gap: [],
      learning: [],
    };

    graph.nodes.forEach((node) => {
      if (columnNodes[node.type]) {
        columnNodes[node.type].push(node);
      } else {
        // Fallback to skill or candidate
        columnNodes.skill.push(node);
      }
    });

    const maxCount = Math.max(
      ...Object.values(columnNodes).map(arr => arr.length),
      6
    );

    const stepY = 56;
    const computedHeight = Math.max(520, 110 + maxCount * stepY);
    const computedWidth = 1060;

    const computedPositions: Record<string, { x: number; y: number }> = {};

    Object.entries(columnNodes).forEach(([colType, nodes]) => {
      const colX = columns[colType] || 500;
      const count = nodes.length;

      if (count === 1) {
        computedPositions[nodes[0].id] = { x: colX, y: computedHeight / 2 };
      } else if (count > 1) {
        const span = (count - 1) * stepY;
        const startY = (computedHeight - span) / 2;
        nodes.forEach((n, idx) => {
          computedPositions[n.id] = {
            x: colX,
            y: startY + idx * stepY,
          };
        });
      }
    });

    return {
      positions: computedPositions,
      totalHeight: computedHeight,
      totalWidth: computedWidth,
    };
  }, [graph]);

  // Edges linked to selected node for highlight
  const connectedEdgeSet = useMemo(() => {
    const set = new Set<string>();
    if (!selectedNode || !graph) return set;
    graph.edges.forEach((e, idx) => {
      if (e.source === selectedNode.id || e.target === selectedNode.id) {
        set.add(`edge-${idx}`);
      }
    });
    return set;
  }, [selectedNode, graph]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-navy-900">Skill Evidence Knowledge Graph</h2>
            {(graph?.target_role || targetTitle) && (
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-full text-[11px] font-bold">
                {graph?.target_role || targetTitle}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Visual topology linking Candidate Profile ➔ Projects ➔ Demonstrated Skills ➔ Target Role ➔ Gaps ➔ Learning Paths
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/jobs"
            className="px-3 py-1.5 bg-white border border-border-subtle hover:bg-gray-50 text-navy-900 font-bold rounded-lg text-xs transition-all"
          >
            Change Target Role
          </Link>

          {/* View Toggle */}
          <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-border-subtle shadow-sm">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                viewMode === 'graph' ? 'bg-navy-900 text-white shadow' : 'text-text-secondary hover:text-navy-900'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Interactive Graph</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                viewMode === 'table' ? 'bg-navy-900 text-white shadow' : 'text-text-secondary hover:text-navy-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Accessible Table</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald animate-spin" />
          <span className="text-xs text-text-secondary font-medium">Generating aligned topology graph...</span>
        </div>
      ) : !graph || graph.nodes.length === 0 ? (
        <div className="max-w-xl mx-auto p-12 bg-white rounded-2xl border border-border-subtle text-center space-y-4 shadow-sm">
          <Target className="w-12 h-12 text-emerald mx-auto" />
          <h3 className="text-lg font-bold text-navy-900">No Evidence Graph Available</h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            Upload a resume and evaluate against a target role to generate the end-to-end evidence graph.
          </p>
          <Link
            to="/jobs"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald text-navy-950 font-bold rounded-lg text-xs"
          >
            <span>Select Target Role</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Graph Canvas or Accessible Table */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-border-subtle shadow-sm p-4 overflow-hidden flex flex-col justify-between">
            {/* 6-Column Layer Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border-subtle text-[11px] font-semibold text-text-secondary">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald shadow-sm"></span>
                <span className="text-navy-900 font-bold">1. Candidate</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm"></span>
                <span>2. Evidence / Projects</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600 shadow-sm"></span>
                <span>3. Demonstrated Skills</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-900 shadow-sm"></span>
                <span className="text-navy-900 font-bold">4. Target Role</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></span>
                <span>5. Requirement Gaps</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-600 shadow-sm"></span>
                <span>6. Learning Paths</span>
              </span>
            </div>

            {viewMode === 'graph' ? (
              <div className="w-full overflow-x-auto py-3">
                <svg
                  viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                  className="w-full min-w-[900px] select-none"
                  style={{ height: `${Math.min(680, totalHeight)}px` }}
                >
                  <defs>
                    <marker
                      id="arrow-default"
                      viewBox="0 0 10 10"
                      refX="22"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94A3B8" />
                    </marker>
                    <marker
                      id="arrow-highlight"
                      viewBox="0 0 10 10"
                      refX="22"
                      refY="5"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10B981" />
                    </marker>
                    <marker
                      id="arrow-gap"
                      viewBox="0 0 10 10"
                      refX="22"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#EF4444" />
                    </marker>
                  </defs>

                  {/* Column Background Bands for Visual Orientation */}
                  <g className="opacity-40">
                    <rect x="25" y="10" width="130" height={totalHeight - 20} rx="12" fill="#F8FAFC" />
                    <rect x="195" y="10" width="130" height={totalHeight - 20} rx="12" fill="#FAF5FF" />
                    <rect x="375" y="10" width="130" height={totalHeight - 20} rx="12" fill="#EFF6FF" />
                    <rect x="555" y="10" width="130" height={totalHeight - 20} rx="12" fill="#F1F5F9" />
                    <rect x="735" y="10" width="130" height={totalHeight - 20} rx="12" fill="#FEF2F2" />
                    <rect x="905" y="10" width="130" height={totalHeight - 20} rx="12" fill="#FFFBEB" />
                  </g>

                  {/* Render Curved Edges */}
                  {graph.edges.map((edge, idx) => {
                    const src = positions[edge.source];
                    const tgt = positions[edge.target];
                    if (!src || !tgt) return null;

                    const isHighlighted = connectedEdgeSet.has(`edge-${idx}`);
                    const isGapEdge = edge.type === 'requirement_gap';
                    const markerId = isHighlighted ? 'url(#arrow-highlight)' : (isGapEdge ? 'url(#arrow-gap)' : 'url(#arrow-default)');

                    // Smooth Bezier Curve between columns
                    const midX = (src.x + tgt.x) / 2;
                    const pathData = `M ${src.x} ${src.y} C ${midX} ${src.y}, ${midX} ${tgt.y}, ${tgt.x} ${tgt.y}`;

                    return (
                      <g key={`edge-${idx}`}>
                        <path
                          d={pathData}
                          fill="none"
                          stroke={isHighlighted ? '#10B981' : (isGapEdge ? '#F87171' : '#CBD5E1')}
                          strokeWidth={isHighlighted ? 2.5 : Math.max(1.2, edge.weight || 1.2)}
                          strokeDasharray={isGapEdge ? '4 3' : 'none'}
                          markerEnd={markerId}
                          className="transition-colors duration-200"
                        />
                      </g>
                    );
                  })}

                  {/* Render Nodes */}
                  {graph.nodes.map((node) => {
                    const pos = positions[node.id];
                    if (!pos) return null;
                    const isSelected = selectedNode?.id === node.id;
                    const color = getNodeColor(node.type);

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={() => setSelectedNode(node)}
                        className="cursor-pointer group"
                      >
                        {/* Outer Glow when selected */}
                        {isSelected && (
                          <circle
                            r={22}
                            fill={color}
                            opacity={0.2}
                            className="animate-pulse"
                          />
                        )}

                        {/* Node Circle */}
                        <circle
                          r={isSelected ? 16 : 13}
                          fill={color}
                          stroke={isSelected ? '#10B981' : '#FFFFFF'}
                          strokeWidth={isSelected ? 3 : 2}
                          className="transition-transform duration-150 group-hover:scale-110 shadow-md"
                        />

                        {/* Node Label */}
                        <text
                          y={23}
                          textAnchor="middle"
                          className={`text-[10px] select-none pointer-events-none ${
                            isSelected ? 'font-black fill-navy-950 text-xs' : 'font-bold fill-navy-900'
                          }`}
                        >
                          {node.label.length > 20 ? `${node.label.substring(0, 18)}...` : node.label}
                        </text>

                        {/* Category or type sublabel */}
                        {node.category && (
                          <text
                            y={34}
                            textAnchor="middle"
                            className="text-[8px] fill-text-secondary select-none pointer-events-none font-medium"
                          >
                            {node.category}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              /* Accessible Table View */
              <div className="overflow-x-auto divide-y divide-border-subtle max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-text-secondary font-semibold">
                    <tr>
                      <th className="p-3">Node Label</th>
                      <th className="p-3">Entity Type</th>
                      <th className="p-3">Status / Category</th>
                      <th className="p-3">Heuristic Score</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {graph.nodes.map((node) => (
                      <tr key={node.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-bold text-navy-900">{node.label}</td>
                        <td className="p-3 capitalize">
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-1.5"
                            style={{ backgroundColor: getNodeColor(node.type) }}
                          />
                          {node.type.replace('_', ' ')}
                        </td>
                        <td className="p-3 text-text-secondary">{node.status || node.category || 'N/A'}</td>
                        <td className="p-3 font-semibold">
                          {node.score !== undefined && node.score !== null ? `${node.score}%` : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedNode(node)}
                            className="text-xs text-emerald font-semibold hover:underline"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Node Inspector Panel */}
          <div className="bg-white p-5 rounded-2xl border border-border-subtle shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                <span className="text-xs font-bold text-emerald uppercase tracking-wider block">Node Inspector</span>
                {selectedNode && (
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: getNodeColor(selectedNode.type) }}
                  />
                )}
              </div>

              {selectedNode ? (
                <div className="mt-4 space-y-4">
                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-text-secondary block">Entity Layer</span>
                    <span className="text-xs font-bold text-navy-900 capitalize block">
                      {selectedNode.type.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-extrabold text-navy-900 leading-snug">{selectedNode.label}</h4>
                    {selectedNode.category && (
                      <span className="text-xs text-text-secondary block mt-0.5">{selectedNode.category}</span>
                    )}
                  </div>

                  {selectedNode.status && (
                    <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-lg text-xs font-semibold">
                      Classification: {selectedNode.status}
                    </div>
                  )}

                  {selectedNode.score !== undefined && selectedNode.score !== null && (
                    <div className="p-2.5 bg-gray-50 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between text-text-secondary">
                        <span>Resume Evidence Score:</span>
                        <span className="font-bold text-navy-900">{selectedNode.score}%</span>
                      </div>
                      <span className="text-[10px] text-text-secondary block italic">
                        Heuristic match detected from resume text; not an external certification.
                      </span>
                    </div>
                  )}

                  {/* Connected Relationships list */}
                  <div className="pt-2 border-t border-border-subtle">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-2">
                      Connected Relationships ({connectedEdgeSet.size})
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {graph.edges
                        .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                        .map((edge, idx) => {
                          const isOutgoing = edge.source === selectedNode.id;
                          const otherId = isOutgoing ? edge.target : edge.source;
                          const otherNode = graph.nodes.find(n => n.id === otherId);
                          return (
                            <div key={idx} className="p-2 bg-gray-50 rounded text-[11px] flex items-center justify-between">
                              <span className="text-text-secondary">
                                {isOutgoing ? `➔ ${edge.label}:` : `⬅ from:`}
                              </span>
                              <span className="font-bold text-navy-900 truncate max-w-[140px]">
                                {otherNode?.label || otherId}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-secondary mt-4">
                  Click any node in the topology graph to inspect evidence relationships and upskilling pathways.
                </p>
              )}
            </div>

            <div className="p-3 bg-gray-50 rounded-xl text-[11px] text-text-secondary leading-relaxed border border-border-subtle">
              💡 <span className="font-semibold text-navy-900">Topology Tip:</span> Nodes represent resume-based evidence detected in resume text and target role requirements. Green connects demonstrated experience; red and amber connect to gap resolutions (heuristic, not independently verified).
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
