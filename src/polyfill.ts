import { DOMParser, parseHTML } from 'linkedom';

const runtime = globalThis as unknown as Record<string, unknown>;

if (!runtime.DOMParser) runtime.DOMParser = DOMParser;
if (!runtime.window) runtime.window = globalThis;
if (!runtime.document) runtime.document = parseHTML('').document;
if (!runtime.Node) runtime.Node = class Node {
  static readonly ELEMENT_NODE = 1;
  static readonly TEXT_NODE = 3;
};
if (!runtime.getComputedStyle) runtime.getComputedStyle = () => ({ display: '' });
