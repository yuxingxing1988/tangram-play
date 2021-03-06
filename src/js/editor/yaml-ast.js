/* eslint-disable no-console */
import YAMLParser from 'yaml-ast-parser';

// YAML node kinds are assigned a number by YAMLParser.
// A node of type SCALAR is a simple key-value pair with a string `value`.
const YAML_SCALAR = 0;

// A node of type MAPPING is a key-value pair whose `value` is another YAML node.
// Values can be another MAPPING, a MAP, or SEQUENCE.
const YAML_MAPPING = 1;

// A node of type MAP is a value of the MAPPING node. It does not have a `value`
// but rather a `mappings` array of one or more YAML nodes.
const YAML_MAP = 2;

// A node of type SEQUENCE is a value of a YAML node. It does not have a `value`
// but rather a `items` array of one or more YAML nodes.
const YAML_SEQUENCE = 3;

// Other node kinds exist, we currently don't handle this.
// const YAML_ANCHOR_REF = 4; //?
// const YAML_INCLUDE_REF = 5; //? only RAML?

const ADDRESS_KEY_DELIMITER = ':';

function parseYAML(content) {
  // Run all the content through the AST parser and store it here.
  // Timing of safeLoad: about 0.5-1.5ms for a small file, could be 20ms+ for a 6000 line Cinnabar.
  // `parsedYAML` will be undefined if content is blank (e.g. empty string)
  const parsedYAML = YAMLParser.safeLoad(content);

  if (parsedYAML && parsedYAML.errors.length > 0) {
    // TODO: Handle errors?
  }

  return parsedYAML;
}

/**
 * Given a parsed syntax tree of YAML, and a position index, return
 * the deepest node that contains that position. Returns nothing if not found.
 *
 * @param {Object} ast - a parsed syntax tree object
 * @param {Number} index - a position index
 * @returns {Object} a node
 */
function getNodeAtIndex(ast, index) {
  function searchNodes(node, idx) {
    // Nodes can be `null` if current document state has errors
    if (!node) return null;

    if (idx < node.startPosition || idx > node.endPosition) {
      if (node.parent) return node.parent;
    }

    switch (node.kind) {
      // A scalar node has no further depth; return as is.
      case YAML_SCALAR:
        return node;
      case YAML_MAPPING:
        return searchNodes(node.value, idx);
      case YAML_MAP:
        // Find the first node in node.mappings that contains idx and
        // continue searching
        for (let i = 0, j = node.mappings.length; i < j; i++) {
          const mapping = node.mappings[i];
          // Can be null if document has errors
          if (!mapping) return null;
          if (idx >= mapping.startPosition && idx <= mapping.endPosition) {
            return searchNodes(mapping, idx);
          }
        }
        return null;
      case YAML_SEQUENCE:
        for (let i = 0, j = node.items.length; i < j; i++) {
          const item = node.items[i];
          // Can be null if document has errors
          if (!item) return null;
          if (idx >= item.startPosition && idx <= item.endPosition) {
            return searchNodes(item, idx);
          }
        }
        return null;
      default:
        if (idx >= node.startPosition && idx <= node.startPosition) {
          return node;
        } else if (node.parent) {
          return node.parent;
        }
        return null;
    }
  }

  const node = searchNodes(ast, index);
  return node;
}

function getNodeAtKeyAddress(ast, address) {

}

/**
 * Given an AST node, construct a key address for it by traversing its parent nodes.
 *
 * @param {Object} theNode - a node from YAML-AST-parser
 * @returns {string} address - an address that looks like "this:string:example"
 */
export function getKeyAddressForNode(theNode) {
  function builder(node, keys = []) {
    // Nodes can be `null` if current document state has errors
    if (!node) return null;

    // Assume key is scalar value
    if (node.key && node.key.kind === 0) {
      keys.push(node.key.value);
    }

    // Traverse parents until we hit no more parents
    if (node.parent) {
      keys.concat(builder(node.parent, keys));
    }

    return keys;
  }

  const addressParts = builder(theNode, []);
  addressParts.reverse();
  return addressParts.join(ADDRESS_KEY_DELIMITER);
}

export class ParsedYAMLDocument {
  constructor(content) {
    this.nodes = {};
    this.regenerate(content);
  }

  regenerate(content) {
    this.nodes = parseYAML(content) || {};
  }

  getNodeAtIndex(index) {
    return getNodeAtIndex(this.nodes, index);
  }

  getNodeAtKeyAddress(address) {
    return getNodeAtKeyAddress(this.nodes, address);
  }
}
