// simple B-Tree for indexing row keys -> row index in the table array
// order = max children per node

class BTreeNode {
  constructor(leaf = true) {
    this.leaf = leaf;
    this.keys = [];   // array of {key, value}
    this.children = [];
  }
}

class BTree {
  constructor(order = 4) {
    this.order = order; // max keys = order - 1
    this.root = new BTreeNode(true);
  }

  search(key, node = this.root) {
    let i = 0;
    while (i < node.keys.length && key > node.keys[i].key) i++;

    if (i < node.keys.length && node.keys[i].key === key) {
      return node.keys[i].value;
    }
    if (node.leaf) return null;
    return this.search(key, node.children[i]);
  }

  insert(key, value) {
    const root = this.root;
    if (root.keys.length === this.order - 1) {
      const newRoot = new BTreeNode(false);
      newRoot.children.push(root);
      this.splitChild(newRoot, 0);
      this.root = newRoot;
      this.insertNonFull(newRoot, key, value);
    } else {
      this.insertNonFull(root, key, value);
    }
  }

  splitChild(parent, index) {
    const order = this.order;
    const child = parent.children[index];
    const mid = Math.floor((order - 1) / 2);

    const newNode = new BTreeNode(child.leaf);
    newNode.keys = child.keys.splice(mid + 1);
    const midKey = child.keys.splice(mid, 1)[0];

    if (!child.leaf) {
      newNode.children = child.children.splice(mid + 1);
    }

    parent.children.splice(index + 1, 0, newNode);
    parent.keys.splice(index, 0, midKey);
  }

  insertNonFull(node, key, value) {
    let i = node.keys.length - 1;

    if (node.leaf) {
      // just find the spot and drop it in
      while (i >= 0 && key < node.keys[i].key) i--;
      node.keys.splice(i + 1, 0, { key, value });
      return;
    }

    while (i >= 0 && key < node.keys[i].key) i--;
    i++;

    if (node.children[i].keys.length === this.order - 1) {
      this.splitChild(node, i);
      if (key > node.keys[i].key) i++;
    }
    this.insertNonFull(node.children[i], key, value);
  }

  // walks the whole tree in order, mostly for debugging / full scans
  toArray(node = this.root, out = []) {
    if (node.leaf) {
      node.keys.forEach(k => out.push(k));
      return out;
    }
    for (let i = 0; i < node.keys.length; i++) {
      this.toArray(node.children[i], out);
      out.push(node.keys[i]);
    }
    this.toArray(node.children[node.keys.length], out);
    return out;
  }
}
