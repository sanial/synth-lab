import React, { useCallback, useEffect, useMemo } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import ReactFlow, {
  Node,
  Edge,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MarkerType,
  Position,
  Handle,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 220;
const nodeHeight = 50;

const CustomNode = ({ id, data, selected }: NodeProps) => {
  return (
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[200px] ${selected ? 'border-blue-500' : 'border-stone-400'}`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-teal-500" />
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium flex-1">{data.label}</div>
        <div className="flex gap-1">
          <button 
            className="w-7 h-7 text-sm font-bold bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            disabled={Boolean(data.isExpanding)}
            onClick={(e) => {
              e.stopPropagation();
              data.onExpand?.({ id, ...data });
            }}
            title={data.isExpanding ? 'Expanding topic...' : 'Add Topic'}
          >
            {data.isExpanding ? <Loader2 size={14} className="animate-spin mx-auto" /> : '+'}
          </button>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-teal-500" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    // We are shifting the dagre node position (which is center) to top left
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};

interface FlowDiagramProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: (node: Node) => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

export const FlowDiagram: React.FC<FlowDiagramProps> = ({ nodes: initialNodes, edges: initialEdges, onNodeClick, onUndo, canUndo = false }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (initialNodes.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        [...initialNodes],
        [...initialEdges]
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="w-full h-[600px] bg-white rounded-2xl border border-[#141414]/10 shadow-sm overflow-hidden relative">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 bg-white/95 border border-[#141414]/10 rounded-lg shadow-sm text-[10px] uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
        title="Undo last expansion"
      >
        <RotateCcw size={12} />
        Undo
      </button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick ? (_, node) => onNodeClick(node) : undefined}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        className="bg-white"
      >
        <Background color="#141414" gap={20} size={1} />
        <Controls className="bg-white border-[#141414]/10 shadow-sm" />
      </ReactFlow>
    </div>
  );
};
