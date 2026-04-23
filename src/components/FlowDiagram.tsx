import React, { useMemo } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import ReactFlow, {
  Node,
  Edge,
  ConnectionLineType,
  Background,
  Controls,
  Position,
  Handle,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

const nodeWidth = 220;
const nodeHeight = 76;

/**
 * Custom React Flow node used for expandable synthesis topics.
 *
 * @param props React Flow node props containing node metadata and selection state.
 * @returns Rendered node card with optional expand action.
 */
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

/**
 * Applies a Dagre-based layout to flow nodes and edges.
 *
 * @param nodes React Flow nodes to position.
 * @param edges React Flow edges to route.
 * @param direction Layout direction (`TB` for vertical, `LR` for horizontal).
 * @returns Object containing layouted nodes and original edges.
 */
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
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

/**
 * Props for the FlowDiagram renderer.
 */
interface FlowDiagramProps {
  /** Graph nodes to visualize. */
  nodes: Node[];
  /** Graph edges connecting nodes. */
  edges: Edge[];
  /** Optional callback invoked when a node is clicked. */
  onNodeClick?: (node: Node) => void;
  /** Optional callback invoked when undo button is pressed. */
  onUndo?: () => void;
  /** Enables/disables the undo action button. */
  canUndo?: boolean;
}

/**
 * Renders the interactive flow diagram for synthesis mode using React Flow.
 *
 * @param props Component props.
 * @param props.nodes Input nodes before auto-layout.
 * @param props.edges Input edges before render.
 * @param props.onNodeClick Optional node click handler.
 * @param props.onUndo Optional undo handler.
 * @param props.canUndo Whether undo is currently available.
 * @returns Rendered flow diagram canvas with controls.
 */
export const FlowDiagram: React.FC<FlowDiagramProps> = ({ nodes: initialNodes, edges: initialEdges, onNodeClick, onUndo, canUndo = false }) => {
  const { nodes, edges } = useMemo(() => {
    if (!initialNodes.length) {
      return { nodes: [], edges: [] };
    }

    return getLayoutedElements(
      initialNodes.map((node) => ({ ...node, data: { ...node.data } })),
      initialEdges.map((edge) => ({ ...edge }))
    );
  }, [initialNodes, initialEdges]);

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
        key={`${nodes.length}-${edges.length}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick ? (_, node) => onNodeClick(node) : undefined}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.35, includeHiddenNodes: true, duration: 0 }}
        minZoom={0.1}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        className="bg-white"
      >
        <Background color="#141414" gap={20} size={1} />
        <Controls className="bg-white border-[#141414]/10 shadow-sm" />
      </ReactFlow>
    </div>
  );
};
