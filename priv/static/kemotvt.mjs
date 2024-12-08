// build/dev/javascript/prelude.mjs
var CustomType = class {
  withFields(fields) {
    let properties = Object.keys(this).map(
      (label) => label in fields ? fields[label] : this[label]
    );
    return new this.constructor(...properties);
  }
};
var List = class {
  static fromArray(array3, tail) {
    let t = tail || new Empty();
    for (let i = array3.length - 1; i >= 0; --i) {
      t = new NonEmpty(array3[i], t);
    }
    return t;
  }
  [Symbol.iterator]() {
    return new ListIterator(this);
  }
  toArray() {
    return [...this];
  }
  // @internal
  atLeastLength(desired) {
    for (let _ of this) {
      if (desired <= 0)
        return true;
      desired--;
    }
    return desired <= 0;
  }
  // @internal
  hasLength(desired) {
    for (let _ of this) {
      if (desired <= 0)
        return false;
      desired--;
    }
    return desired === 0;
  }
  // @internal
  countLength() {
    let length4 = 0;
    for (let _ of this)
      length4++;
    return length4;
  }
};
function prepend(element3, tail) {
  return new NonEmpty(element3, tail);
}
function toList(elements2, tail) {
  return List.fromArray(elements2, tail);
}
var ListIterator = class {
  #current;
  constructor(current) {
    this.#current = current;
  }
  next() {
    if (this.#current instanceof Empty) {
      return { done: true };
    } else {
      let { head, tail } = this.#current;
      this.#current = tail;
      return { value: head, done: false };
    }
  }
};
var Empty = class extends List {
};
var NonEmpty = class extends List {
  constructor(head, tail) {
    super();
    this.head = head;
    this.tail = tail;
  }
};
var BitArray = class _BitArray {
  constructor(buffer) {
    if (!(buffer instanceof Uint8Array)) {
      throw "BitArray can only be constructed from a Uint8Array";
    }
    this.buffer = buffer;
  }
  // @internal
  get length() {
    return this.buffer.length;
  }
  // @internal
  byteAt(index3) {
    return this.buffer[index3];
  }
  // @internal
  floatFromSlice(start3, end, isBigEndian) {
    return byteArrayToFloat(this.buffer, start3, end, isBigEndian);
  }
  // @internal
  intFromSlice(start3, end, isBigEndian, isSigned) {
    return byteArrayToInt(this.buffer, start3, end, isBigEndian, isSigned);
  }
  // @internal
  binaryFromSlice(start3, end) {
    return new _BitArray(this.buffer.slice(start3, end));
  }
  // @internal
  sliceAfter(index3) {
    return new _BitArray(this.buffer.slice(index3));
  }
};
var UtfCodepoint = class {
  constructor(value4) {
    this.value = value4;
  }
};
function byteArrayToInt(byteArray, start3, end, isBigEndian, isSigned) {
  const byteSize = end - start3;
  if (byteSize <= 6) {
    let value4 = 0;
    if (isBigEndian) {
      for (let i = start3; i < end; i++) {
        value4 = value4 * 256 + byteArray[i];
      }
    } else {
      for (let i = end - 1; i >= start3; i--) {
        value4 = value4 * 256 + byteArray[i];
      }
    }
    if (isSigned) {
      const highBit = 2 ** (byteSize * 8 - 1);
      if (value4 >= highBit) {
        value4 -= highBit * 2;
      }
    }
    return value4;
  } else {
    let value4 = 0n;
    if (isBigEndian) {
      for (let i = start3; i < end; i++) {
        value4 = (value4 << 8n) + BigInt(byteArray[i]);
      }
    } else {
      for (let i = end - 1; i >= start3; i--) {
        value4 = (value4 << 8n) + BigInt(byteArray[i]);
      }
    }
    if (isSigned) {
      const highBit = 1n << BigInt(byteSize * 8 - 1);
      if (value4 >= highBit) {
        value4 -= highBit * 2n;
      }
    }
    return Number(value4);
  }
}
function byteArrayToFloat(byteArray, start3, end, isBigEndian) {
  const view2 = new DataView(byteArray.buffer);
  const byteSize = end - start3;
  if (byteSize === 8) {
    return view2.getFloat64(start3, !isBigEndian);
  } else if (byteSize === 4) {
    return view2.getFloat32(start3, !isBigEndian);
  } else {
    const msg = `Sized floats must be 32-bit or 64-bit on JavaScript, got size of ${byteSize * 8} bits`;
    throw new globalThis.Error(msg);
  }
}
var Result = class _Result extends CustomType {
  // @internal
  static isResult(data) {
    return data instanceof _Result;
  }
};
var Ok = class extends Result {
  constructor(value4) {
    super();
    this[0] = value4;
  }
  // @internal
  isOk() {
    return true;
  }
};
var Error2 = class extends Result {
  constructor(detail) {
    super();
    this[0] = detail;
  }
  // @internal
  isOk() {
    return false;
  }
};
function isEqual(x, y) {
  let values2 = [x, y];
  while (values2.length) {
    let a = values2.pop();
    let b = values2.pop();
    if (a === b)
      continue;
    if (!isObject(a) || !isObject(b))
      return false;
    let unequal = !structurallyCompatibleObjects(a, b) || unequalDates(a, b) || unequalBuffers(a, b) || unequalArrays(a, b) || unequalMaps(a, b) || unequalSets(a, b) || unequalRegExps(a, b);
    if (unequal)
      return false;
    const proto = Object.getPrototypeOf(a);
    if (proto !== null && typeof proto.equals === "function") {
      try {
        if (a.equals(b))
          continue;
        else
          return false;
      } catch {
      }
    }
    let [keys2, get3] = getters(a);
    for (let k of keys2(a)) {
      values2.push(get3(a, k), get3(b, k));
    }
  }
  return true;
}
function getters(object3) {
  if (object3 instanceof Map) {
    return [(x) => x.keys(), (x, y) => x.get(y)];
  } else {
    let extra = object3 instanceof globalThis.Error ? ["message"] : [];
    return [(x) => [...extra, ...Object.keys(x)], (x, y) => x[y]];
  }
}
function unequalDates(a, b) {
  return a instanceof Date && (a > b || a < b);
}
function unequalBuffers(a, b) {
  return a.buffer instanceof ArrayBuffer && a.BYTES_PER_ELEMENT && !(a.byteLength === b.byteLength && a.every((n, i) => n === b[i]));
}
function unequalArrays(a, b) {
  return Array.isArray(a) && a.length !== b.length;
}
function unequalMaps(a, b) {
  return a instanceof Map && a.size !== b.size;
}
function unequalSets(a, b) {
  return a instanceof Set && (a.size != b.size || [...a].some((e) => !b.has(e)));
}
function unequalRegExps(a, b) {
  return a instanceof RegExp && (a.source !== b.source || a.flags !== b.flags);
}
function isObject(a) {
  return typeof a === "object" && a !== null;
}
function structurallyCompatibleObjects(a, b) {
  if (typeof a !== "object" && typeof b !== "object" && (!a || !b))
    return false;
  let nonstructural = [Promise, WeakSet, WeakMap, Function];
  if (nonstructural.some((c) => a instanceof c))
    return false;
  return a.constructor === b.constructor;
}
function makeError(variant, module, line, fn, message, extra) {
  let error = new globalThis.Error(message);
  error.gleam_error = variant;
  error.module = module;
  error.line = line;
  error.function = fn;
  error.fn = fn;
  for (let k in extra)
    error[k] = extra[k];
  return error;
}

// build/dev/javascript/gleam_javascript/gleam_javascript_ffi.mjs
function toArray(list2) {
  return list2.toArray();
}
function reduceRight(thing, acc, fn) {
  return thing.reduceRight(fn, acc);
}
function index(thing, index3) {
  return index3 in thing ? new Ok(thing[index3]) : new Error2(void 0);
}

// build/dev/javascript/gleam_javascript/gleam/javascript/array.mjs
function to_list(items) {
  return reduceRight(
    items,
    toList([]),
    (list2, item) => {
      return prepend(item, list2);
    }
  );
}

// build/dev/javascript/gleam_stdlib/gleam/option.mjs
var Some = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var None = class extends CustomType {
};
function to_result(option, e) {
  if (option instanceof Some) {
    let a = option[0];
    return new Ok(a);
  } else {
    return new Error2(e);
  }
}
function unwrap(option, default$) {
  if (option instanceof Some) {
    let x = option[0];
    return x;
  } else {
    return default$;
  }
}
function lazy_unwrap(option, default$) {
  if (option instanceof Some) {
    let x = option[0];
    return x;
  } else {
    return default$();
  }
}
function map2(option, fun) {
  if (option instanceof Some) {
    let x = option[0];
    return new Some(fun(x));
  } else {
    return new None();
  }
}

// build/dev/javascript/gleam_stdlib/dict.mjs
var referenceMap = /* @__PURE__ */ new WeakMap();
var tempDataView = new DataView(new ArrayBuffer(8));
var referenceUID = 0;
function hashByReference(o) {
  const known = referenceMap.get(o);
  if (known !== void 0) {
    return known;
  }
  const hash = referenceUID++;
  if (referenceUID === 2147483647) {
    referenceUID = 0;
  }
  referenceMap.set(o, hash);
  return hash;
}
function hashMerge(a, b) {
  return a ^ b + 2654435769 + (a << 6) + (a >> 2) | 0;
}
function hashString(s) {
  let hash = 0;
  const len = s.length;
  for (let i = 0; i < len; i++) {
    hash = Math.imul(31, hash) + s.charCodeAt(i) | 0;
  }
  return hash;
}
function hashNumber(n) {
  tempDataView.setFloat64(0, n);
  const i = tempDataView.getInt32(0);
  const j = tempDataView.getInt32(4);
  return Math.imul(73244475, i >> 16 ^ i) ^ j;
}
function hashBigInt(n) {
  return hashString(n.toString());
}
function hashObject(o) {
  const proto = Object.getPrototypeOf(o);
  if (proto !== null && typeof proto.hashCode === "function") {
    try {
      const code2 = o.hashCode(o);
      if (typeof code2 === "number") {
        return code2;
      }
    } catch {
    }
  }
  if (o instanceof Promise || o instanceof WeakSet || o instanceof WeakMap) {
    return hashByReference(o);
  }
  if (o instanceof Date) {
    return hashNumber(o.getTime());
  }
  let h = 0;
  if (o instanceof ArrayBuffer) {
    o = new Uint8Array(o);
  }
  if (Array.isArray(o) || o instanceof Uint8Array) {
    for (let i = 0; i < o.length; i++) {
      h = Math.imul(31, h) + getHash(o[i]) | 0;
    }
  } else if (o instanceof Set) {
    o.forEach((v) => {
      h = h + getHash(v) | 0;
    });
  } else if (o instanceof Map) {
    o.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
  } else {
    const keys2 = Object.keys(o);
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      const v = o[k];
      h = h + hashMerge(getHash(v), hashString(k)) | 0;
    }
  }
  return h;
}
function getHash(u) {
  if (u === null)
    return 1108378658;
  if (u === void 0)
    return 1108378659;
  if (u === true)
    return 1108378657;
  if (u === false)
    return 1108378656;
  switch (typeof u) {
    case "number":
      return hashNumber(u);
    case "string":
      return hashString(u);
    case "bigint":
      return hashBigInt(u);
    case "object":
      return hashObject(u);
    case "symbol":
      return hashByReference(u);
    case "function":
      return hashByReference(u);
    default:
      return 0;
  }
}
var SHIFT = 5;
var BUCKET_SIZE = Math.pow(2, SHIFT);
var MASK = BUCKET_SIZE - 1;
var MAX_INDEX_NODE = BUCKET_SIZE / 2;
var MIN_ARRAY_NODE = BUCKET_SIZE / 4;
var ENTRY = 0;
var ARRAY_NODE = 1;
var INDEX_NODE = 2;
var COLLISION_NODE = 3;
var EMPTY = {
  type: INDEX_NODE,
  bitmap: 0,
  array: []
};
function mask(hash, shift) {
  return hash >>> shift & MASK;
}
function bitpos(hash, shift) {
  return 1 << mask(hash, shift);
}
function bitcount(x) {
  x -= x >> 1 & 1431655765;
  x = (x & 858993459) + (x >> 2 & 858993459);
  x = x + (x >> 4) & 252645135;
  x += x >> 8;
  x += x >> 16;
  return x & 127;
}
function index2(bitmap, bit) {
  return bitcount(bitmap & bit - 1);
}
function cloneAndSet(arr, at, val) {
  const len = arr.length;
  const out = new Array(len);
  for (let i = 0; i < len; ++i) {
    out[i] = arr[i];
  }
  out[at] = val;
  return out;
}
function spliceIn(arr, at, val) {
  const len = arr.length;
  const out = new Array(len + 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  out[g++] = val;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function spliceOut(arr, at) {
  const len = arr.length;
  const out = new Array(len - 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  ++i;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function createNode(shift, key1, val1, key2hash, key2, val2) {
  const key1hash = getHash(key1);
  if (key1hash === key2hash) {
    return {
      type: COLLISION_NODE,
      hash: key1hash,
      array: [
        { type: ENTRY, k: key1, v: val1 },
        { type: ENTRY, k: key2, v: val2 }
      ]
    };
  }
  const addedLeaf = { val: false };
  return assoc(
    assocIndex(EMPTY, shift, key1hash, key1, val1, addedLeaf),
    shift,
    key2hash,
    key2,
    val2,
    addedLeaf
  );
}
function assoc(root, shift, hash, key2, val, addedLeaf) {
  switch (root.type) {
    case ARRAY_NODE:
      return assocArray(root, shift, hash, key2, val, addedLeaf);
    case INDEX_NODE:
      return assocIndex(root, shift, hash, key2, val, addedLeaf);
    case COLLISION_NODE:
      return assocCollision(root, shift, hash, key2, val, addedLeaf);
  }
}
function assocArray(root, shift, hash, key2, val, addedLeaf) {
  const idx = mask(hash, shift);
  const node2 = root.array[idx];
  if (node2 === void 0) {
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root.size + 1,
      array: cloneAndSet(root.array, idx, { type: ENTRY, k: key2, v: val })
    };
  }
  if (node2.type === ENTRY) {
    if (isEqual(key2, node2.k)) {
      if (val === node2.v) {
        return root;
      }
      return {
        type: ARRAY_NODE,
        size: root.size,
        array: cloneAndSet(root.array, idx, {
          type: ENTRY,
          k: key2,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root.size,
      array: cloneAndSet(
        root.array,
        idx,
        createNode(shift + SHIFT, node2.k, node2.v, hash, key2, val)
      )
    };
  }
  const n = assoc(node2, shift + SHIFT, hash, key2, val, addedLeaf);
  if (n === node2) {
    return root;
  }
  return {
    type: ARRAY_NODE,
    size: root.size,
    array: cloneAndSet(root.array, idx, n)
  };
}
function assocIndex(root, shift, hash, key2, val, addedLeaf) {
  const bit = bitpos(hash, shift);
  const idx = index2(root.bitmap, bit);
  if ((root.bitmap & bit) !== 0) {
    const node2 = root.array[idx];
    if (node2.type !== ENTRY) {
      const n = assoc(node2, shift + SHIFT, hash, key2, val, addedLeaf);
      if (n === node2) {
        return root;
      }
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap,
        array: cloneAndSet(root.array, idx, n)
      };
    }
    const nodeKey = node2.k;
    if (isEqual(key2, nodeKey)) {
      if (val === node2.v) {
        return root;
      }
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap,
        array: cloneAndSet(root.array, idx, {
          type: ENTRY,
          k: key2,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: INDEX_NODE,
      bitmap: root.bitmap,
      array: cloneAndSet(
        root.array,
        idx,
        createNode(shift + SHIFT, nodeKey, node2.v, hash, key2, val)
      )
    };
  } else {
    const n = root.array.length;
    if (n >= MAX_INDEX_NODE) {
      const nodes = new Array(32);
      const jdx = mask(hash, shift);
      nodes[jdx] = assocIndex(EMPTY, shift + SHIFT, hash, key2, val, addedLeaf);
      let j = 0;
      let bitmap = root.bitmap;
      for (let i = 0; i < 32; i++) {
        if ((bitmap & 1) !== 0) {
          const node2 = root.array[j++];
          nodes[i] = node2;
        }
        bitmap = bitmap >>> 1;
      }
      return {
        type: ARRAY_NODE,
        size: n + 1,
        array: nodes
      };
    } else {
      const newArray = spliceIn(root.array, idx, {
        type: ENTRY,
        k: key2,
        v: val
      });
      addedLeaf.val = true;
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap | bit,
        array: newArray
      };
    }
  }
}
function assocCollision(root, shift, hash, key2, val, addedLeaf) {
  if (hash === root.hash) {
    const idx = collisionIndexOf(root, key2);
    if (idx !== -1) {
      const entry = root.array[idx];
      if (entry.v === val) {
        return root;
      }
      return {
        type: COLLISION_NODE,
        hash,
        array: cloneAndSet(root.array, idx, { type: ENTRY, k: key2, v: val })
      };
    }
    const size = root.array.length;
    addedLeaf.val = true;
    return {
      type: COLLISION_NODE,
      hash,
      array: cloneAndSet(root.array, size, { type: ENTRY, k: key2, v: val })
    };
  }
  return assoc(
    {
      type: INDEX_NODE,
      bitmap: bitpos(root.hash, shift),
      array: [root]
    },
    shift,
    hash,
    key2,
    val,
    addedLeaf
  );
}
function collisionIndexOf(root, key2) {
  const size = root.array.length;
  for (let i = 0; i < size; i++) {
    if (isEqual(key2, root.array[i].k)) {
      return i;
    }
  }
  return -1;
}
function find(root, shift, hash, key2) {
  switch (root.type) {
    case ARRAY_NODE:
      return findArray(root, shift, hash, key2);
    case INDEX_NODE:
      return findIndex(root, shift, hash, key2);
    case COLLISION_NODE:
      return findCollision(root, key2);
  }
}
function findArray(root, shift, hash, key2) {
  const idx = mask(hash, shift);
  const node2 = root.array[idx];
  if (node2 === void 0) {
    return void 0;
  }
  if (node2.type !== ENTRY) {
    return find(node2, shift + SHIFT, hash, key2);
  }
  if (isEqual(key2, node2.k)) {
    return node2;
  }
  return void 0;
}
function findIndex(root, shift, hash, key2) {
  const bit = bitpos(hash, shift);
  if ((root.bitmap & bit) === 0) {
    return void 0;
  }
  const idx = index2(root.bitmap, bit);
  const node2 = root.array[idx];
  if (node2.type !== ENTRY) {
    return find(node2, shift + SHIFT, hash, key2);
  }
  if (isEqual(key2, node2.k)) {
    return node2;
  }
  return void 0;
}
function findCollision(root, key2) {
  const idx = collisionIndexOf(root, key2);
  if (idx < 0) {
    return void 0;
  }
  return root.array[idx];
}
function without(root, shift, hash, key2) {
  switch (root.type) {
    case ARRAY_NODE:
      return withoutArray(root, shift, hash, key2);
    case INDEX_NODE:
      return withoutIndex(root, shift, hash, key2);
    case COLLISION_NODE:
      return withoutCollision(root, key2);
  }
}
function withoutArray(root, shift, hash, key2) {
  const idx = mask(hash, shift);
  const node2 = root.array[idx];
  if (node2 === void 0) {
    return root;
  }
  let n = void 0;
  if (node2.type === ENTRY) {
    if (!isEqual(node2.k, key2)) {
      return root;
    }
  } else {
    n = without(node2, shift + SHIFT, hash, key2);
    if (n === node2) {
      return root;
    }
  }
  if (n === void 0) {
    if (root.size <= MIN_ARRAY_NODE) {
      const arr = root.array;
      const out = new Array(root.size - 1);
      let i = 0;
      let j = 0;
      let bitmap = 0;
      while (i < idx) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      ++i;
      while (i < arr.length) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      return {
        type: INDEX_NODE,
        bitmap,
        array: out
      };
    }
    return {
      type: ARRAY_NODE,
      size: root.size - 1,
      array: cloneAndSet(root.array, idx, n)
    };
  }
  return {
    type: ARRAY_NODE,
    size: root.size,
    array: cloneAndSet(root.array, idx, n)
  };
}
function withoutIndex(root, shift, hash, key2) {
  const bit = bitpos(hash, shift);
  if ((root.bitmap & bit) === 0) {
    return root;
  }
  const idx = index2(root.bitmap, bit);
  const node2 = root.array[idx];
  if (node2.type !== ENTRY) {
    const n = without(node2, shift + SHIFT, hash, key2);
    if (n === node2) {
      return root;
    }
    if (n !== void 0) {
      return {
        type: INDEX_NODE,
        bitmap: root.bitmap,
        array: cloneAndSet(root.array, idx, n)
      };
    }
    if (root.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root.bitmap ^ bit,
      array: spliceOut(root.array, idx)
    };
  }
  if (isEqual(key2, node2.k)) {
    if (root.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root.bitmap ^ bit,
      array: spliceOut(root.array, idx)
    };
  }
  return root;
}
function withoutCollision(root, key2) {
  const idx = collisionIndexOf(root, key2);
  if (idx < 0) {
    return root;
  }
  if (root.array.length === 1) {
    return void 0;
  }
  return {
    type: COLLISION_NODE,
    hash: root.hash,
    array: spliceOut(root.array, idx)
  };
}
function forEach(root, fn) {
  if (root === void 0) {
    return;
  }
  const items = root.array;
  const size = items.length;
  for (let i = 0; i < size; i++) {
    const item = items[i];
    if (item === void 0) {
      continue;
    }
    if (item.type === ENTRY) {
      fn(item.v, item.k);
      continue;
    }
    forEach(item, fn);
  }
}
var Dict = class _Dict {
  /**
   * @template V
   * @param {Record<string,V>} o
   * @returns {Dict<string,V>}
   */
  static fromObject(o) {
    const keys2 = Object.keys(o);
    let m = _Dict.new();
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      m = m.set(k, o[k]);
    }
    return m;
  }
  /**
   * @template K,V
   * @param {Map<K,V>} o
   * @returns {Dict<K,V>}
   */
  static fromMap(o) {
    let m = _Dict.new();
    o.forEach((v, k) => {
      m = m.set(k, v);
    });
    return m;
  }
  static new() {
    return new _Dict(void 0, 0);
  }
  /**
   * @param {undefined | Node<K,V>} root
   * @param {number} size
   */
  constructor(root, size) {
    this.root = root;
    this.size = size;
  }
  /**
   * @template NotFound
   * @param {K} key
   * @param {NotFound} notFound
   * @returns {NotFound | V}
   */
  get(key2, notFound) {
    if (this.root === void 0) {
      return notFound;
    }
    const found = find(this.root, 0, getHash(key2), key2);
    if (found === void 0) {
      return notFound;
    }
    return found.v;
  }
  /**
   * @param {K} key
   * @param {V} val
   * @returns {Dict<K,V>}
   */
  set(key2, val) {
    const addedLeaf = { val: false };
    const root = this.root === void 0 ? EMPTY : this.root;
    const newRoot = assoc(root, 0, getHash(key2), key2, val, addedLeaf);
    if (newRoot === this.root) {
      return this;
    }
    return new _Dict(newRoot, addedLeaf.val ? this.size + 1 : this.size);
  }
  /**
   * @param {K} key
   * @returns {Dict<K,V>}
   */
  delete(key2) {
    if (this.root === void 0) {
      return this;
    }
    const newRoot = without(this.root, 0, getHash(key2), key2);
    if (newRoot === this.root) {
      return this;
    }
    if (newRoot === void 0) {
      return _Dict.new();
    }
    return new _Dict(newRoot, this.size - 1);
  }
  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key2) {
    if (this.root === void 0) {
      return false;
    }
    return find(this.root, 0, getHash(key2), key2) !== void 0;
  }
  /**
   * @returns {[K,V][]}
   */
  entries() {
    if (this.root === void 0) {
      return [];
    }
    const result = [];
    this.forEach((v, k) => result.push([k, v]));
    return result;
  }
  /**
   *
   * @param {(val:V,key:K)=>void} fn
   */
  forEach(fn) {
    forEach(this.root, fn);
  }
  hashCode() {
    let h = 0;
    this.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
    return h;
  }
  /**
   * @param {unknown} o
   * @returns {boolean}
   */
  equals(o) {
    if (!(o instanceof _Dict) || this.size !== o.size) {
      return false;
    }
    let equal = true;
    this.forEach((v, k) => {
      equal = equal && isEqual(o.get(k, !v), v);
    });
    return equal;
  }
};

// build/dev/javascript/gleam_stdlib/gleam_stdlib.mjs
var Nil = void 0;
var NOT_FOUND = {};
function identity(x) {
  return x;
}
function to_string(term) {
  return term.toString();
}
function float_to_string(float3) {
  const string3 = float3.toString().replace("+", "");
  if (string3.indexOf(".") >= 0) {
    return string3;
  } else {
    const index3 = string3.indexOf("e");
    if (index3 >= 0) {
      return string3.slice(0, index3) + ".0" + string3.slice(index3);
    } else {
      return string3 + ".0";
    }
  }
}
function string_length(string3) {
  if (string3 === "") {
    return 0;
  }
  const iterator = graphemes_iterator(string3);
  if (iterator) {
    let i = 0;
    for (const _ of iterator) {
      i++;
    }
    return i;
  } else {
    return string3.match(/./gsu).length;
  }
}
var segmenter = void 0;
function graphemes_iterator(string3) {
  if (globalThis.Intl && Intl.Segmenter) {
    segmenter ||= new Intl.Segmenter();
    return segmenter.segment(string3)[Symbol.iterator]();
  }
}
function add(a, b) {
  return a + b;
}
function join(xs, separator) {
  const iterator = xs[Symbol.iterator]();
  let result = iterator.next().value || "";
  let current = iterator.next();
  while (!current.done) {
    result = result + separator + current.value;
    current = iterator.next();
  }
  return result;
}
function concat(xs) {
  let result = "";
  for (const x of xs) {
    result = result + x;
  }
  return result;
}
function string_slice(string3, idx, len) {
  if (len <= 0 || idx >= string3.length) {
    return "";
  }
  const iterator = graphemes_iterator(string3);
  if (iterator) {
    while (idx-- > 0) {
      iterator.next();
    }
    let result = "";
    while (len-- > 0) {
      const v = iterator.next().value;
      if (v === void 0) {
        break;
      }
      result += v.segment;
    }
    return result;
  } else {
    return string3.match(/./gsu).slice(idx, idx + len).join("");
  }
}
var unicode_whitespaces = [
  " ",
  // Space
  "	",
  // Horizontal tab
  "\n",
  // Line feed
  "\v",
  // Vertical tab
  "\f",
  // Form feed
  "\r",
  // Carriage return
  "\x85",
  // Next line
  "\u2028",
  // Line separator
  "\u2029"
  // Paragraph separator
].join("");
var left_trim_regex = new RegExp(`^([${unicode_whitespaces}]*)`, "g");
var right_trim_regex = new RegExp(`([${unicode_whitespaces}]*)$`, "g");
function new_map() {
  return Dict.new();
}
function map_to_list(map6) {
  return List.fromArray(map6.entries());
}
function map_get(map6, key2) {
  const value4 = map6.get(key2, NOT_FOUND);
  if (value4 === NOT_FOUND) {
    return new Error2(Nil);
  }
  return new Ok(value4);
}
function map_insert(key2, value4, map6) {
  return map6.set(key2, value4);
}
function classify_dynamic(data) {
  if (typeof data === "string") {
    return "String";
  } else if (typeof data === "boolean") {
    return "Bool";
  } else if (data instanceof Result) {
    return "Result";
  } else if (data instanceof List) {
    return "List";
  } else if (data instanceof BitArray) {
    return "BitArray";
  } else if (data instanceof Dict) {
    return "Dict";
  } else if (Number.isInteger(data)) {
    return "Int";
  } else if (Array.isArray(data)) {
    return `Tuple of ${data.length} elements`;
  } else if (typeof data === "number") {
    return "Float";
  } else if (data === null) {
    return "Null";
  } else if (data === void 0) {
    return "Nil";
  } else {
    const type = typeof data;
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
function decoder_error(expected, got) {
  return decoder_error_no_classify(expected, classify_dynamic(got));
}
function decoder_error_no_classify(expected, got) {
  return new Error2(
    List.fromArray([new DecodeError(expected, got, List.fromArray([]))])
  );
}
function decode_string(data) {
  return typeof data === "string" ? new Ok(data) : decoder_error("String", data);
}
function decode_int(data) {
  return Number.isInteger(data) ? new Ok(data) : decoder_error("Int", data);
}
function decode_list(data) {
  if (Array.isArray(data)) {
    return new Ok(List.fromArray(data));
  }
  return data instanceof List ? new Ok(data) : decoder_error("List", data);
}
function decode_field(value4, name) {
  const not_a_map_error = () => decoder_error("Dict", value4);
  if (value4 instanceof Dict || value4 instanceof WeakMap || value4 instanceof Map) {
    const entry = map_get(value4, name);
    return new Ok(entry.isOk() ? new Some(entry[0]) : new None());
  } else if (value4 === null) {
    return not_a_map_error();
  } else if (Object.getPrototypeOf(value4) == Object.prototype) {
    return try_get_field(value4, name, () => new Ok(new None()));
  } else {
    return try_get_field(value4, name, not_a_map_error);
  }
}
function try_get_field(value4, field2, or_else) {
  try {
    return field2 in value4 ? new Ok(new Some(value4[field2])) : or_else();
  } catch {
    return or_else();
  }
}
function inspect(v) {
  const t = typeof v;
  if (v === true)
    return "True";
  if (v === false)
    return "False";
  if (v === null)
    return "//js(null)";
  if (v === void 0)
    return "Nil";
  if (t === "string")
    return inspectString(v);
  if (t === "bigint" || Number.isInteger(v))
    return v.toString();
  if (t === "number")
    return float_to_string(v);
  if (Array.isArray(v))
    return `#(${v.map(inspect).join(", ")})`;
  if (v instanceof List)
    return inspectList(v);
  if (v instanceof UtfCodepoint)
    return inspectUtfCodepoint(v);
  if (v instanceof BitArray)
    return inspectBitArray(v);
  if (v instanceof CustomType)
    return inspectCustomType(v);
  if (v instanceof Dict)
    return inspectDict(v);
  if (v instanceof Set)
    return `//js(Set(${[...v].map(inspect).join(", ")}))`;
  if (v instanceof RegExp)
    return `//js(${v})`;
  if (v instanceof Date)
    return `//js(Date("${v.toISOString()}"))`;
  if (v instanceof Function) {
    const args = [];
    for (const i of Array(v.length).keys())
      args.push(String.fromCharCode(i + 97));
    return `//fn(${args.join(", ")}) { ... }`;
  }
  return inspectObject(v);
}
function inspectString(str) {
  let new_str = '"';
  for (let i = 0; i < str.length; i++) {
    let char = str[i];
    switch (char) {
      case "\n":
        new_str += "\\n";
        break;
      case "\r":
        new_str += "\\r";
        break;
      case "	":
        new_str += "\\t";
        break;
      case "\f":
        new_str += "\\f";
        break;
      case "\\":
        new_str += "\\\\";
        break;
      case '"':
        new_str += '\\"';
        break;
      default:
        if (char < " " || char > "~" && char < "\xA0") {
          new_str += "\\u{" + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0") + "}";
        } else {
          new_str += char;
        }
    }
  }
  new_str += '"';
  return new_str;
}
function inspectDict(map6) {
  let body = "dict.from_list([";
  let first3 = true;
  map6.forEach((value4, key2) => {
    if (!first3)
      body = body + ", ";
    body = body + "#(" + inspect(key2) + ", " + inspect(value4) + ")";
    first3 = false;
  });
  return body + "])";
}
function inspectObject(v) {
  const name = Object.getPrototypeOf(v)?.constructor?.name || "Object";
  const props = [];
  for (const k of Object.keys(v)) {
    props.push(`${inspect(k)}: ${inspect(v[k])}`);
  }
  const body = props.length ? " " + props.join(", ") + " " : "";
  const head = name === "Object" ? "" : name + " ";
  return `//js(${head}{${body}})`;
}
function inspectCustomType(record) {
  const props = Object.keys(record).map((label) => {
    const value4 = inspect(record[label]);
    return isNaN(parseInt(label)) ? `${label}: ${value4}` : value4;
  }).join(", ");
  return props ? `${record.constructor.name}(${props})` : record.constructor.name;
}
function inspectList(list2) {
  return `[${list2.toArray().map(inspect).join(", ")}]`;
}
function inspectBitArray(bits) {
  return `<<${Array.from(bits.buffer).join(", ")}>>`;
}
function inspectUtfCodepoint(codepoint2) {
  return `//utfcodepoint(${String.fromCodePoint(codepoint2.value)})`;
}

// build/dev/javascript/gleam_stdlib/gleam/float.mjs
function to_string2(x) {
  return float_to_string(x);
}

// build/dev/javascript/gleam_stdlib/gleam/int.mjs
function to_string3(x) {
  return to_string(x);
}
function to_float(x) {
  return identity(x);
}

// build/dev/javascript/gleam_stdlib/gleam/dict.mjs
function new$() {
  return new_map();
}
function get(from2, get3) {
  return map_get(from2, get3);
}
function insert(dict, key2, value4) {
  return map_insert(key2, value4, dict);
}
function reverse_and_concat(loop$remaining, loop$accumulator) {
  while (true) {
    let remaining = loop$remaining;
    let accumulator = loop$accumulator;
    if (remaining.hasLength(0)) {
      return accumulator;
    } else {
      let item = remaining.head;
      let rest = remaining.tail;
      loop$remaining = rest;
      loop$accumulator = prepend(item, accumulator);
    }
  }
}
function do_keys_loop(loop$list, loop$acc) {
  while (true) {
    let list2 = loop$list;
    let acc = loop$acc;
    if (list2.hasLength(0)) {
      return reverse_and_concat(acc, toList([]));
    } else {
      let first3 = list2.head;
      let rest = list2.tail;
      loop$list = rest;
      loop$acc = prepend(first3[0], acc);
    }
  }
}
function do_keys(dict) {
  let list_of_pairs = map_to_list(dict);
  return do_keys_loop(list_of_pairs, toList([]));
}
function keys(dict) {
  return do_keys(dict);
}
function do_values_loop(loop$list, loop$acc) {
  while (true) {
    let list2 = loop$list;
    let acc = loop$acc;
    if (list2.hasLength(0)) {
      return reverse_and_concat(acc, toList([]));
    } else {
      let first3 = list2.head;
      let rest = list2.tail;
      loop$list = rest;
      loop$acc = prepend(first3[1], acc);
    }
  }
}
function do_values(dict) {
  let list_of_pairs = map_to_list(dict);
  return do_values_loop(list_of_pairs, toList([]));
}
function values(dict) {
  return do_values(dict);
}

// build/dev/javascript/gleam_stdlib/gleam/pair.mjs
function first(pair) {
  let a = pair[0];
  return a;
}
function second(pair) {
  let a = pair[1];
  return a;
}
function map_first(pair, fun) {
  let a = pair[0];
  let b = pair[1];
  return [fun(a), b];
}
function map_second(pair, fun) {
  let a = pair[0];
  let b = pair[1];
  return [a, fun(b)];
}
function new$2(first3, second2) {
  return [first3, second2];
}

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
function reverse_loop(loop$remaining, loop$accumulator) {
  while (true) {
    let remaining = loop$remaining;
    let accumulator = loop$accumulator;
    if (remaining.hasLength(0)) {
      return accumulator;
    } else {
      let item = remaining.head;
      let rest$1 = remaining.tail;
      loop$remaining = rest$1;
      loop$accumulator = prepend(item, accumulator);
    }
  }
}
function reverse(list2) {
  return reverse_loop(list2, toList([]));
}
function is_empty(list2) {
  return isEqual(list2, toList([]));
}
function filter_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list2 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list2.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list2.head;
      let rest$1 = list2.tail;
      let new_acc = (() => {
        let $ = fun(first$1);
        if ($) {
          return prepend(first$1, acc);
        } else {
          return acc;
        }
      })();
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = new_acc;
    }
  }
}
function filter(list2, predicate) {
  return filter_loop(list2, predicate, toList([]));
}
function map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list2 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list2.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list2.head;
      let rest$1 = list2.tail;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = prepend(fun(first$1), acc);
    }
  }
}
function map3(list2, fun) {
  return map_loop(list2, fun, toList([]));
}
function try_map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list2 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list2.hasLength(0)) {
      return new Ok(reverse(acc));
    } else {
      let first$1 = list2.head;
      let rest$1 = list2.tail;
      let $ = fun(first$1);
      if ($.isOk()) {
        let first$2 = $[0];
        loop$list = rest$1;
        loop$fun = fun;
        loop$acc = prepend(first$2, acc);
      } else {
        let error = $[0];
        return new Error2(error);
      }
    }
  }
}
function try_map(list2, fun) {
  return try_map_loop(list2, fun, toList([]));
}
function append_loop(loop$first, loop$second) {
  while (true) {
    let first3 = loop$first;
    let second2 = loop$second;
    if (first3.hasLength(0)) {
      return second2;
    } else {
      let item = first3.head;
      let rest$1 = first3.tail;
      loop$first = rest$1;
      loop$second = prepend(item, second2);
    }
  }
}
function append(first3, second2) {
  return append_loop(reverse(first3), second2);
}
function prepend2(list2, item) {
  return prepend(item, list2);
}
function reverse_and_prepend(loop$prefix, loop$suffix) {
  while (true) {
    let prefix = loop$prefix;
    let suffix = loop$suffix;
    if (prefix.hasLength(0)) {
      return suffix;
    } else {
      let first$1 = prefix.head;
      let rest$1 = prefix.tail;
      loop$prefix = rest$1;
      loop$suffix = prepend(first$1, suffix);
    }
  }
}
function concat_loop(loop$lists, loop$acc) {
  while (true) {
    let lists = loop$lists;
    let acc = loop$acc;
    if (lists.hasLength(0)) {
      return reverse(acc);
    } else {
      let list2 = lists.head;
      let further_lists = lists.tail;
      loop$lists = further_lists;
      loop$acc = reverse_and_prepend(list2, acc);
    }
  }
}
function flatten(lists) {
  return concat_loop(lists, toList([]));
}
function flat_map(list2, fun) {
  let _pipe = map3(list2, fun);
  return flatten(_pipe);
}
function fold(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list2 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list2.hasLength(0)) {
      return initial;
    } else {
      let x = list2.head;
      let rest$1 = list2.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, x);
      loop$fun = fun;
    }
  }
}
function index_fold_loop(loop$over, loop$acc, loop$with, loop$index) {
  while (true) {
    let over = loop$over;
    let acc = loop$acc;
    let with$ = loop$with;
    let index3 = loop$index;
    if (over.hasLength(0)) {
      return acc;
    } else {
      let first$1 = over.head;
      let rest$1 = over.tail;
      loop$over = rest$1;
      loop$acc = with$(acc, first$1, index3);
      loop$with = with$;
      loop$index = index3 + 1;
    }
  }
}
function index_fold(list2, initial, fun) {
  return index_fold_loop(list2, initial, fun, 0);
}

// build/dev/javascript/gleam_stdlib/gleam/string_tree.mjs
function append_tree(tree, suffix) {
  return add(tree, suffix);
}
function from_strings(strings) {
  return concat(strings);
}
function from_string(string3) {
  return identity(string3);
}
function append2(tree, second2) {
  return append_tree(tree, from_string(second2));
}
function to_string4(tree) {
  return identity(tree);
}

// build/dev/javascript/gleam_stdlib/gleam/string.mjs
function length3(string3) {
  return string_length(string3);
}
function slice(string3, idx, len) {
  let $ = len < 0;
  if ($) {
    return "";
  } else {
    let $1 = idx < 0;
    if ($1) {
      let translated_idx = length3(string3) + idx;
      let $2 = translated_idx < 0;
      if ($2) {
        return "";
      } else {
        return string_slice(string3, translated_idx, len);
      }
    } else {
      return string_slice(string3, idx, len);
    }
  }
}
function drop_start(string3, num_graphemes) {
  let $ = num_graphemes < 0;
  if ($) {
    return string3;
  } else {
    return slice(string3, num_graphemes, length3(string3) - num_graphemes);
  }
}
function drop_left(string3, num_graphemes) {
  return drop_start(string3, num_graphemes);
}
function append3(first3, second2) {
  let _pipe = first3;
  let _pipe$1 = from_string(_pipe);
  let _pipe$2 = append2(_pipe$1, second2);
  return to_string4(_pipe$2);
}
function repeat_loop(loop$string, loop$times, loop$acc) {
  while (true) {
    let string3 = loop$string;
    let times = loop$times;
    let acc = loop$acc;
    let $ = times <= 0;
    if ($) {
      return acc;
    } else {
      loop$string = string3;
      loop$times = times - 1;
      loop$acc = acc + string3;
    }
  }
}
function repeat(string3, times) {
  return repeat_loop(string3, times, "");
}
function join2(strings, separator) {
  return join(strings, separator);
}
function inspect2(term) {
  let _pipe = inspect(term);
  return to_string4(_pipe);
}

// build/dev/javascript/gleam_stdlib/gleam/result.mjs
function map4(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return new Ok(fun(x));
  } else {
    let e = result[0];
    return new Error2(e);
  }
}
function map_error(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return new Ok(x);
  } else {
    let error = result[0];
    return new Error2(fun(error));
  }
}
function try$(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return fun(x);
  } else {
    let e = result[0];
    return new Error2(e);
  }
}
function lazy_unwrap2(result, default$) {
  if (result.isOk()) {
    let v = result[0];
    return v;
  } else {
    return default$();
  }
}

// build/dev/javascript/gleam_stdlib/gleam/dynamic.mjs
var DecodeError = class extends CustomType {
  constructor(expected, found, path) {
    super();
    this.expected = expected;
    this.found = found;
    this.path = path;
  }
};
function dynamic(value4) {
  return new Ok(value4);
}
function classify(data) {
  return classify_dynamic(data);
}
function int(data) {
  return decode_int(data);
}
function shallow_list(value4) {
  return decode_list(value4);
}
function any(decoders) {
  return (data) => {
    if (decoders.hasLength(0)) {
      return new Error2(
        toList([new DecodeError("another type", classify(data), toList([]))])
      );
    } else {
      let decoder = decoders.head;
      let decoders$1 = decoders.tail;
      let $ = decoder(data);
      if ($.isOk()) {
        let decoded = $[0];
        return new Ok(decoded);
      } else {
        return any(decoders$1)(data);
      }
    }
  };
}
function push_path(error, name) {
  let name$1 = identity(name);
  let decoder = any(
    toList([string, (x) => {
      return map4(int(x), to_string3);
    }])
  );
  let name$2 = (() => {
    let $ = decoder(name$1);
    if ($.isOk()) {
      let name$22 = $[0];
      return name$22;
    } else {
      let _pipe = toList(["<", classify(name$1), ">"]);
      let _pipe$1 = from_strings(_pipe);
      return to_string4(_pipe$1);
    }
  })();
  return error.withFields({ path: prepend(name$2, error.path) });
}
function list(decoder_type) {
  return (dynamic2) => {
    return try$(
      shallow_list(dynamic2),
      (list2) => {
        let _pipe = list2;
        let _pipe$1 = try_map(_pipe, decoder_type);
        return map_errors(
          _pipe$1,
          (_capture) => {
            return push_path(_capture, "*");
          }
        );
      }
    );
  };
}
function map_errors(result, f) {
  return map_error(
    result,
    (_capture) => {
      return map3(_capture, f);
    }
  );
}
function string(data) {
  return decode_string(data);
}
function field(name, inner_type) {
  return (value4) => {
    let missing_field_error = new DecodeError("field", "nothing", toList([]));
    return try$(
      decode_field(value4, name),
      (maybe_inner) => {
        let _pipe = maybe_inner;
        let _pipe$1 = to_result(_pipe, toList([missing_field_error]));
        let _pipe$2 = try$(_pipe$1, inner_type);
        return map_errors(
          _pipe$2,
          (_capture) => {
            return push_path(_capture, name);
          }
        );
      }
    );
  };
}

// build/dev/javascript/gleam_stdlib/gleam/bool.mjs
function guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence;
  } else {
    return alternative();
  }
}

// build/dev/javascript/lustre/lustre/effect.mjs
var Effect = class extends CustomType {
  constructor(all) {
    super();
    this.all = all;
  }
};
function custom(run) {
  return new Effect(
    toList([
      (actions) => {
        return run(actions.dispatch, actions.emit, actions.select, actions.root);
      }
    ])
  );
}
function from(effect) {
  return custom((dispatch, _, _1, _2) => {
    return effect(dispatch);
  });
}
function none() {
  return new Effect(toList([]));
}

// build/dev/javascript/lustre/lustre/internals/vdom.mjs
var Text = class extends CustomType {
  constructor(content) {
    super();
    this.content = content;
  }
};
var Element2 = class extends CustomType {
  constructor(key2, namespace, tag, attrs, children2, self_closing, void$) {
    super();
    this.key = key2;
    this.namespace = namespace;
    this.tag = tag;
    this.attrs = attrs;
    this.children = children2;
    this.self_closing = self_closing;
    this.void = void$;
  }
};
var Map2 = class extends CustomType {
  constructor(subtree) {
    super();
    this.subtree = subtree;
  }
};
var Attribute = class extends CustomType {
  constructor(x0, x1, as_property) {
    super();
    this[0] = x0;
    this[1] = x1;
    this.as_property = as_property;
  }
};
var Event2 = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
function attribute_to_event_handler(attribute2) {
  if (attribute2 instanceof Attribute) {
    return new Error2(void 0);
  } else {
    let name = attribute2[0];
    let handler = attribute2[1];
    let name$1 = drop_left(name, 2);
    return new Ok([name$1, handler]);
  }
}
function do_element_list_handlers(elements2, handlers2, key2) {
  return index_fold(
    elements2,
    handlers2,
    (handlers3, element3, index3) => {
      let key$1 = key2 + "-" + to_string3(index3);
      return do_handlers(element3, handlers3, key$1);
    }
  );
}
function do_handlers(loop$element, loop$handlers, loop$key) {
  while (true) {
    let element3 = loop$element;
    let handlers2 = loop$handlers;
    let key2 = loop$key;
    if (element3 instanceof Text) {
      return handlers2;
    } else if (element3 instanceof Map2) {
      let subtree = element3.subtree;
      loop$element = subtree();
      loop$handlers = handlers2;
      loop$key = key2;
    } else {
      let attrs = element3.attrs;
      let children2 = element3.children;
      let handlers$1 = fold(
        attrs,
        handlers2,
        (handlers3, attr) => {
          let $ = attribute_to_event_handler(attr);
          if ($.isOk()) {
            let name = $[0][0];
            let handler = $[0][1];
            return insert(handlers3, key2 + "-" + name, handler);
          } else {
            return handlers3;
          }
        }
      );
      return do_element_list_handlers(children2, handlers$1, key2);
    }
  }
}
function handlers(element3) {
  return do_handlers(element3, new$(), "0");
}

// build/dev/javascript/lustre/lustre/attribute.mjs
function attribute(name, value4) {
  return new Attribute(name, identity(value4), false);
}
function on(name, handler) {
  return new Event2("on" + name, handler);
}
function style(properties) {
  return attribute(
    "style",
    fold(
      properties,
      "",
      (styles, _use1) => {
        let name$1 = _use1[0];
        let value$1 = _use1[1];
        return styles + name$1 + ":" + value$1 + ";";
      }
    )
  );
}
function class$(name) {
  return attribute("class", name);
}
function id(name) {
  return attribute("id", name);
}
function type_(name) {
  return attribute("type", name);
}
function value(val) {
  return attribute("value", val);
}

// build/dev/javascript/lustre/lustre/element.mjs
function element(tag, attrs, children2) {
  if (tag === "area") {
    return new Element2("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "base") {
    return new Element2("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "br") {
    return new Element2("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "col") {
    return new Element2("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "embed") {
    return new Element2("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "hr") {
    return new Element2("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "img") {
    return new Element2("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "input") {
    return new Element2("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "link") {
    return new Element2("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "meta") {
    return new Element2("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "param") {
    return new Element2("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "source") {
    return new Element2("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "track") {
    return new Element2("", "", tag, attrs, toList([]), false, true);
  } else if (tag === "wbr") {
    return new Element2("", "", tag, attrs, toList([]), false, true);
  } else {
    return new Element2("", "", tag, attrs, children2, false, false);
  }
}
function text(content) {
  return new Text(content);
}
function none2() {
  return new Text("");
}
function fragment(elements2) {
  return element(
    "lustre-fragment",
    toList([style(toList([["display", "contents"]]))]),
    elements2
  );
}

// build/dev/javascript/gleam_stdlib/gleam/set.mjs
var Set2 = class extends CustomType {
  constructor(dict) {
    super();
    this.dict = dict;
  }
};
function new$4() {
  return new Set2(new$());
}

// build/dev/javascript/lustre/lustre/internals/patch.mjs
var Diff = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Emit = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Init = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
function is_empty_element_diff(diff2) {
  return isEqual(diff2.created, new$()) && isEqual(
    diff2.removed,
    new$4()
  ) && isEqual(diff2.updated, new$());
}

// build/dev/javascript/lustre/lustre/internals/runtime.mjs
var Attrs = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Batch = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Debug = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Dispatch = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Emit2 = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Event3 = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Shutdown = class extends CustomType {
};
var Subscribe = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var Unsubscribe = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var ForceModel = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};

// build/dev/javascript/lustre/vdom.ffi.mjs
if (window && window.customElements) {
  window.customElements.define(
    "lustre-fragment",
    class LustreFragment extends HTMLElement {
      constructor() {
        super();
      }
    }
  );
}
function morph(prev, next, dispatch) {
  let out;
  let stack = [{ prev, next, parent: prev.parentNode }];
  while (stack.length) {
    let { prev: prev2, next: next2, parent } = stack.pop();
    while (next2.subtree !== void 0)
      next2 = next2.subtree();
    if (next2.content !== void 0) {
      if (!prev2) {
        const created = document.createTextNode(next2.content);
        parent.appendChild(created);
        out ??= created;
      } else if (prev2.nodeType === Node.TEXT_NODE) {
        if (prev2.textContent !== next2.content)
          prev2.textContent = next2.content;
        out ??= prev2;
      } else {
        const created = document.createTextNode(next2.content);
        parent.replaceChild(created, prev2);
        out ??= created;
      }
    } else if (next2.tag !== void 0) {
      const created = createElementNode({
        prev: prev2,
        next: next2,
        dispatch,
        stack
      });
      if (!prev2) {
        parent.appendChild(created);
      } else if (prev2 !== created) {
        parent.replaceChild(created, prev2);
      }
      out ??= created;
    }
  }
  return out;
}
function createElementNode({ prev, next, dispatch, stack }) {
  const namespace = next.namespace || "http://www.w3.org/1999/xhtml";
  const canMorph = prev && prev.nodeType === Node.ELEMENT_NODE && prev.localName === next.tag && prev.namespaceURI === (next.namespace || "http://www.w3.org/1999/xhtml");
  const el = canMorph ? prev : namespace ? document.createElementNS(namespace, next.tag) : document.createElement(next.tag);
  let handlersForEl;
  if (!registeredHandlers.has(el)) {
    const emptyHandlers = /* @__PURE__ */ new Map();
    registeredHandlers.set(el, emptyHandlers);
    handlersForEl = emptyHandlers;
  } else {
    handlersForEl = registeredHandlers.get(el);
  }
  const prevHandlers = canMorph ? new Set(handlersForEl.keys()) : null;
  const prevAttributes = canMorph ? new Set(Array.from(prev.attributes, (a) => a.name)) : null;
  let className = null;
  let style3 = null;
  let innerHTML = null;
  if (canMorph && next.tag === "textarea") {
    const innertText = next.children[Symbol.iterator]().next().value?.content;
    if (innertText !== void 0)
      el.value = innertText;
  }
  const delegated = [];
  for (const attr of next.attrs) {
    const name = attr[0];
    const value4 = attr[1];
    if (attr.as_property) {
      if (el[name] !== value4)
        el[name] = value4;
      if (canMorph)
        prevAttributes.delete(name);
    } else if (name.startsWith("on")) {
      const eventName = name.slice(2);
      const callback = dispatch(value4, eventName === "input");
      if (!handlersForEl.has(eventName)) {
        el.addEventListener(eventName, lustreGenericEventHandler);
      }
      handlersForEl.set(eventName, callback);
      if (canMorph)
        prevHandlers.delete(eventName);
    } else if (name.startsWith("data-lustre-on-")) {
      const eventName = name.slice(15);
      const callback = dispatch(lustreServerEventHandler);
      if (!handlersForEl.has(eventName)) {
        el.addEventListener(eventName, lustreGenericEventHandler);
      }
      handlersForEl.set(eventName, callback);
      el.setAttribute(name, value4);
    } else if (name.startsWith("delegate:data-") || name.startsWith("delegate:aria-")) {
      el.setAttribute(name, value4);
      delegated.push([name.slice(10), value4]);
    } else if (name === "class") {
      className = className === null ? value4 : className + " " + value4;
    } else if (name === "style") {
      style3 = style3 === null ? value4 : style3 + value4;
    } else if (name === "dangerous-unescaped-html") {
      innerHTML = value4;
    } else {
      if (el.getAttribute(name) !== value4)
        el.setAttribute(name, value4);
      if (name === "value" || name === "selected")
        el[name] = value4;
      if (canMorph)
        prevAttributes.delete(name);
    }
  }
  if (className !== null) {
    el.setAttribute("class", className);
    if (canMorph)
      prevAttributes.delete("class");
  }
  if (style3 !== null) {
    el.setAttribute("style", style3);
    if (canMorph)
      prevAttributes.delete("style");
  }
  if (canMorph) {
    for (const attr of prevAttributes) {
      el.removeAttribute(attr);
    }
    for (const eventName of prevHandlers) {
      handlersForEl.delete(eventName);
      el.removeEventListener(eventName, lustreGenericEventHandler);
    }
  }
  if (next.tag === "slot") {
    window.queueMicrotask(() => {
      for (const child of el.assignedElements()) {
        for (const [name, value4] of delegated) {
          if (!child.hasAttribute(name)) {
            child.setAttribute(name, value4);
          }
        }
      }
    });
  }
  if (next.key !== void 0 && next.key !== "") {
    el.setAttribute("data-lustre-key", next.key);
  } else if (innerHTML !== null) {
    el.innerHTML = innerHTML;
    return el;
  }
  let prevChild = el.firstChild;
  let seenKeys = null;
  let keyedChildren = null;
  let incomingKeyedChildren = null;
  let firstChild = children(next).next().value;
  if (canMorph && firstChild !== void 0 && // Explicit checks are more verbose but truthy checks force a bunch of comparisons
  // we don't care about: it's never gonna be a number etc.
  firstChild.key !== void 0 && firstChild.key !== "") {
    seenKeys = /* @__PURE__ */ new Set();
    keyedChildren = getKeyedChildren(prev);
    incomingKeyedChildren = getKeyedChildren(next);
    for (const child of children(next)) {
      prevChild = diffKeyedChild(
        prevChild,
        child,
        el,
        stack,
        incomingKeyedChildren,
        keyedChildren,
        seenKeys
      );
    }
  } else {
    for (const child of children(next)) {
      stack.unshift({ prev: prevChild, next: child, parent: el });
      prevChild = prevChild?.nextSibling;
    }
  }
  while (prevChild) {
    const next2 = prevChild.nextSibling;
    el.removeChild(prevChild);
    prevChild = next2;
  }
  return el;
}
var registeredHandlers = /* @__PURE__ */ new WeakMap();
function lustreGenericEventHandler(event2) {
  const target2 = event2.currentTarget;
  if (!registeredHandlers.has(target2)) {
    target2.removeEventListener(event2.type, lustreGenericEventHandler);
    return;
  }
  const handlersForEventTarget = registeredHandlers.get(target2);
  if (!handlersForEventTarget.has(event2.type)) {
    target2.removeEventListener(event2.type, lustreGenericEventHandler);
    return;
  }
  handlersForEventTarget.get(event2.type)(event2);
}
function lustreServerEventHandler(event2) {
  const el = event2.currentTarget;
  const tag = el.getAttribute(`data-lustre-on-${event2.type}`);
  const data = JSON.parse(el.getAttribute("data-lustre-data") || "{}");
  const include = JSON.parse(el.getAttribute("data-lustre-include") || "[]");
  switch (event2.type) {
    case "input":
    case "change":
      include.push("target.value");
      break;
  }
  return {
    tag,
    data: include.reduce(
      (data2, property2) => {
        const path = property2.split(".");
        for (let i = 0, o = data2, e = event2; i < path.length; i++) {
          if (i === path.length - 1) {
            o[path[i]] = e[path[i]];
          } else {
            o[path[i]] ??= {};
            e = e[path[i]];
            o = o[path[i]];
          }
        }
        return data2;
      },
      { data }
    )
  };
}
function getKeyedChildren(el) {
  const keyedChildren = /* @__PURE__ */ new Map();
  if (el) {
    for (const child of children(el)) {
      const key2 = child?.key || child?.getAttribute?.("data-lustre-key");
      if (key2)
        keyedChildren.set(key2, child);
    }
  }
  return keyedChildren;
}
function diffKeyedChild(prevChild, child, el, stack, incomingKeyedChildren, keyedChildren, seenKeys) {
  while (prevChild && !incomingKeyedChildren.has(prevChild.getAttribute("data-lustre-key"))) {
    const nextChild = prevChild.nextSibling;
    el.removeChild(prevChild);
    prevChild = nextChild;
  }
  if (keyedChildren.size === 0) {
    stack.unshift({ prev: prevChild, next: child, parent: el });
    prevChild = prevChild?.nextSibling;
    return prevChild;
  }
  if (seenKeys.has(child.key)) {
    console.warn(`Duplicate key found in Lustre vnode: ${child.key}`);
    stack.unshift({ prev: null, next: child, parent: el });
    return prevChild;
  }
  seenKeys.add(child.key);
  const keyedChild = keyedChildren.get(child.key);
  if (!keyedChild && !prevChild) {
    stack.unshift({ prev: null, next: child, parent: el });
    return prevChild;
  }
  if (!keyedChild && prevChild !== null) {
    const placeholder = document.createTextNode("");
    el.insertBefore(placeholder, prevChild);
    stack.unshift({ prev: placeholder, next: child, parent: el });
    return prevChild;
  }
  if (!keyedChild || keyedChild === prevChild) {
    stack.unshift({ prev: prevChild, next: child, parent: el });
    prevChild = prevChild?.nextSibling;
    return prevChild;
  }
  el.insertBefore(keyedChild, prevChild);
  stack.unshift({ prev: keyedChild, next: child, parent: el });
  return prevChild;
}
function* children(element3) {
  for (const child of element3.children) {
    yield* forceChild(child);
  }
}
function* forceChild(element3) {
  if (element3.subtree !== void 0) {
    yield* forceChild(element3.subtree());
  } else {
    yield element3;
  }
}

// build/dev/javascript/lustre/lustre.ffi.mjs
var LustreClientApplication = class _LustreClientApplication {
  /**
   * @template Flags
   *
   * @param {object} app
   * @param {(flags: Flags) => [Model, Lustre.Effect<Msg>]} app.init
   * @param {(msg: Msg, model: Model) => [Model, Lustre.Effect<Msg>]} app.update
   * @param {(model: Model) => Lustre.Element<Msg>} app.view
   * @param {string | HTMLElement} selector
   * @param {Flags} flags
   *
   * @returns {Gleam.Ok<(action: Lustre.Action<Lustre.Client, Msg>>) => void>}
   */
  static start({ init: init3, update: update2, view: view2 }, selector, flags) {
    if (!is_browser())
      return new Error2(new NotABrowser());
    const root = selector instanceof HTMLElement ? selector : document.querySelector(selector);
    if (!root)
      return new Error2(new ElementNotFound(selector));
    const app = new _LustreClientApplication(root, init3(flags), update2, view2);
    return new Ok((action) => app.send(action));
  }
  /**
   * @param {Element} root
   * @param {[Model, Lustre.Effect<Msg>]} init
   * @param {(model: Model, msg: Msg) => [Model, Lustre.Effect<Msg>]} update
   * @param {(model: Model) => Lustre.Element<Msg>} view
   *
   * @returns {LustreClientApplication}
   */
  constructor(root, [init3, effects], update2, view2) {
    this.root = root;
    this.#model = init3;
    this.#update = update2;
    this.#view = view2;
    this.#tickScheduled = window.requestAnimationFrame(
      () => this.#tick(effects.all.toArray(), true)
    );
  }
  /** @type {Element} */
  root;
  /**
   * @param {Lustre.Action<Lustre.Client, Msg>} action
   *
   * @returns {void}
   */
  send(action) {
    if (action instanceof Debug) {
      if (action[0] instanceof ForceModel) {
        this.#tickScheduled = window.cancelAnimationFrame(this.#tickScheduled);
        this.#queue = [];
        this.#model = action[0][0];
        const vdom = this.#view(this.#model);
        const dispatch = (handler, immediate = false) => (event2) => {
          const result = handler(event2);
          if (result instanceof Ok) {
            this.send(new Dispatch(result[0], immediate));
          }
        };
        const prev = this.root.firstChild ?? this.root.appendChild(document.createTextNode(""));
        morph(prev, vdom, dispatch);
      }
    } else if (action instanceof Dispatch) {
      const msg = action[0];
      const immediate = action[1] ?? false;
      this.#queue.push(msg);
      if (immediate) {
        this.#tickScheduled = window.cancelAnimationFrame(this.#tickScheduled);
        this.#tick();
      } else if (!this.#tickScheduled) {
        this.#tickScheduled = window.requestAnimationFrame(() => this.#tick());
      }
    } else if (action instanceof Emit2) {
      const event2 = action[0];
      const data = action[1];
      this.root.dispatchEvent(
        new CustomEvent(event2, {
          detail: data,
          bubbles: true,
          composed: true
        })
      );
    } else if (action instanceof Shutdown) {
      this.#tickScheduled = window.cancelAnimationFrame(this.#tickScheduled);
      this.#model = null;
      this.#update = null;
      this.#view = null;
      this.#queue = null;
      while (this.root.firstChild) {
        this.root.firstChild.remove();
      }
    }
  }
  /** @type {Model} */
  #model;
  /** @type {(model: Model, msg: Msg) => [Model, Lustre.Effect<Msg>]} */
  #update;
  /** @type {(model: Model) => Lustre.Element<Msg>} */
  #view;
  /** @type {Array<Msg>} */
  #queue = [];
  /** @type {number | undefined} */
  #tickScheduled;
  /**
   * @param {Lustre.Effect<Msg>[]} effects
   * @param {boolean} isFirstRender
   */
  #tick(effects = [], isFirstRender = false) {
    this.#tickScheduled = void 0;
    if (!this.#flush(effects, isFirstRender))
      return;
    const vdom = this.#view(this.#model);
    const dispatch = (handler, immediate = false) => (event2) => {
      const result = handler(event2);
      if (result instanceof Ok) {
        this.send(new Dispatch(result[0], immediate));
      }
    };
    const prev = this.root.firstChild ?? this.root.appendChild(document.createTextNode(""));
    morph(prev, vdom, dispatch);
  }
  #flush(effects = [], didUpdate = false) {
    while (this.#queue.length > 0) {
      const msg = this.#queue.shift();
      const [next, effect] = this.#update(this.#model, msg);
      didUpdate ||= this.#model !== next;
      effects = effects.concat(effect.all.toArray());
      this.#model = next;
    }
    while (effects.length > 0) {
      const effect = effects.shift();
      const dispatch = (msg) => this.send(new Dispatch(msg));
      const emit2 = (event2, data) => this.root.dispatchEvent(
        new CustomEvent(event2, {
          detail: data,
          bubbles: true,
          composed: true
        })
      );
      const select = () => {
      };
      const root = this.root;
      effect({ dispatch, emit: emit2, select, root });
    }
    if (this.#queue.length > 0) {
      return this.#flush(effects, didUpdate);
    } else {
      return didUpdate;
    }
  }
};
var start = LustreClientApplication.start;
var LustreServerApplication = class _LustreServerApplication {
  static start({ init: init3, update: update2, view: view2, on_attribute_change }, flags) {
    const app = new _LustreServerApplication(
      init3(flags),
      update2,
      view2,
      on_attribute_change
    );
    return new Ok((action) => app.send(action));
  }
  constructor([model, effects], update2, view2, on_attribute_change) {
    this.#model = model;
    this.#update = update2;
    this.#view = view2;
    this.#html = view2(model);
    this.#onAttributeChange = on_attribute_change;
    this.#renderers = /* @__PURE__ */ new Map();
    this.#handlers = handlers(this.#html);
    this.#tick(effects.all.toArray());
  }
  send(action) {
    if (action instanceof Attrs) {
      for (const attr of action[0]) {
        const decoder = this.#onAttributeChange.get(attr[0]);
        if (!decoder)
          continue;
        const msg = decoder(attr[1]);
        if (msg instanceof Error2)
          continue;
        this.#queue.push(msg);
      }
      this.#tick();
    } else if (action instanceof Batch) {
      this.#queue = this.#queue.concat(action[0].toArray());
      this.#tick(action[1].all.toArray());
    } else if (action instanceof Debug) {
    } else if (action instanceof Dispatch) {
      this.#queue.push(action[0]);
      this.#tick();
    } else if (action instanceof Emit2) {
      const event2 = new Emit(action[0], action[1]);
      for (const [_, renderer] of this.#renderers) {
        renderer(event2);
      }
    } else if (action instanceof Event3) {
      const handler = this.#handlers.get(action[0]);
      if (!handler)
        return;
      const msg = handler(action[1]);
      if (msg instanceof Error2)
        return;
      this.#queue.push(msg[0]);
      this.#tick();
    } else if (action instanceof Subscribe) {
      const attrs = keys(this.#onAttributeChange);
      const patch = new Init(attrs, this.#html);
      this.#renderers = this.#renderers.set(action[0], action[1]);
      action[1](patch);
    } else if (action instanceof Unsubscribe) {
      this.#renderers = this.#renderers.delete(action[0]);
    }
  }
  #model;
  #update;
  #queue;
  #view;
  #html;
  #renderers;
  #handlers;
  #onAttributeChange;
  #tick(effects = []) {
    if (!this.#flush(false, effects))
      return;
    const vdom = this.#view(this.#model);
    const diff2 = elements(this.#html, vdom);
    if (!is_empty_element_diff(diff2)) {
      const patch = new Diff(diff2);
      for (const [_, renderer] of this.#renderers) {
        renderer(patch);
      }
    }
    this.#html = vdom;
    this.#handlers = diff2.handlers;
  }
  #flush(didUpdate = false, effects = []) {
    while (this.#queue.length > 0) {
      const msg = this.#queue.shift();
      const [next, effect] = this.#update(this.#model, msg);
      didUpdate ||= this.#model !== next;
      effects = effects.concat(effect.all.toArray());
      this.#model = next;
    }
    while (effects.length > 0) {
      const effect = effects.shift();
      const dispatch = (msg) => this.send(new Dispatch(msg));
      const emit2 = (event2, data) => this.root.dispatchEvent(
        new CustomEvent(event2, {
          detail: data,
          bubbles: true,
          composed: true
        })
      );
      const select = () => {
      };
      const root = null;
      effect({ dispatch, emit: emit2, select, root });
    }
    if (this.#queue.length > 0) {
      return this.#flush(didUpdate, effects);
    } else {
      return didUpdate;
    }
  }
};
var start_server_application = LustreServerApplication.start;
var is_browser = () => globalThis.window && window.document;

// build/dev/javascript/lustre/lustre.mjs
var App = class extends CustomType {
  constructor(init3, update2, view2, on_attribute_change) {
    super();
    this.init = init3;
    this.update = update2;
    this.view = view2;
    this.on_attribute_change = on_attribute_change;
  }
};
var ElementNotFound = class extends CustomType {
  constructor(selector) {
    super();
    this.selector = selector;
  }
};
var NotABrowser = class extends CustomType {
};
function application(init3, update2, view2) {
  return new App(init3, update2, view2, new None());
}
function start2(app, selector, flags) {
  return guard(
    !is_browser(),
    new Error2(new NotABrowser()),
    () => {
      return start(app, selector, flags);
    }
  );
}

// build/dev/javascript/lustre/lustre/event.mjs
function on2(name, handler) {
  return on(name, handler);
}
function on_click(msg) {
  return on2("click", (_) => {
    return new Ok(msg);
  });
}
function value2(event2) {
  let _pipe = event2;
  return field("target", field("value", string))(
    _pipe
  );
}
function on_input(msg) {
  return on2(
    "input",
    (event2) => {
      let _pipe = value2(event2);
      return map4(_pipe, msg);
    }
  );
}

// build/dev/javascript/sketch/sketch/internals/class.mjs
var Definitions = class extends CustomType {
  constructor(medias_def, selectors_def, class_def) {
    super();
    this.medias_def = medias_def;
    this.selectors_def = selectors_def;
    this.class_def = class_def;
  }
};
var Content = class extends CustomType {
  constructor(class_name4, class_id, definitions2, rules) {
    super();
    this.class_name = class_name4;
    this.class_id = class_id;
    this.definitions = definitions2;
    this.rules = rules;
  }
};
function class_name(class$4) {
  return class$4.class_name;
}
function definitions(class$4) {
  let $ = class$4.definitions;
  let medias = $.medias_def;
  let selectors = $.selectors_def;
  let class$1 = $.class_def;
  let _pipe = toList([toList([class$1]), selectors, medias]);
  return flatten(_pipe);
}
function create(class_name4, class_id, rules, definitions2) {
  return new Content(class_name4, class_id, definitions2, rules);
}

// build/dev/javascript/sketch/sketch/internals/string.mjs
function indent(indent2) {
  return repeat(" ", indent2);
}
function wrap_class(id2, properties, idt, pseudo) {
  let base_indent = indent(idt);
  let pseudo_ = unwrap(pseudo, "");
  let _pipe = prepend(
    base_indent + "." + id2 + pseudo_ + " {",
    properties
  );
  let _pipe$1 = join2(_pipe, "\n");
  return append3(_pipe$1, "\n" + base_indent + "}");
}

// build/dev/javascript/sketch/xxhash.ffi.bin.mjs
var wasmBytes = "AGFzbQEAAAABMAhgA39/fwF/YAN/f38AYAJ/fwBgAX8Bf2ADf39+AX5gA35/fwF+YAJ/fgBgAX8BfgMLCgAAAgEDBAUGAQcFAwEAAQdVCQNtZW0CAAV4eGgzMgAABmluaXQzMgACCHVwZGF0ZTMyAAMIZGlnZXN0MzIABAV4eGg2NAAFBmluaXQ2NAAHCHVwZGF0ZTY0AAgIZGlnZXN0NjQACQr7FgryAQEEfyAAIAFqIQMgAUEQTwR/IANBEGshBiACQaiIjaECaiEDIAJBievQ0AdrIQQgAkHPjKKOBmohBQNAIAMgACgCAEH3lK+veGxqQQ13QbHz3fF5bCEDIAQgAEEEaiIAKAIAQfeUr694bGpBDXdBsfPd8XlsIQQgAiAAQQRqIgAoAgBB95Svr3hsakENd0Gx893xeWwhAiAFIABBBGoiACgCAEH3lK+veGxqQQ13QbHz3fF5bCEFIAYgAEEEaiIATw0ACyACQQx3IAVBEndqIARBB3dqIANBAXdqBSACQbHP2bIBagsgAWogACABQQ9xEAELkgEAIAEgAmohAgNAIAFBBGogAktFBEAgACABKAIAQb3cypV8bGpBEXdBr9bTvgJsIQAgAUEEaiEBDAELCwNAIAEgAk9FBEAgACABLQAAQbHP2bIBbGpBC3dBsfPd8XlsIQAgAUEBaiEBDAELCyAAIABBD3ZzQfeUr694bCIAQQ12IABzQb3cypV8bCIAQRB2IABzCz8AIABBCGogAUGoiI2hAmo2AgAgAEEMaiABQYnr0NAHazYCACAAQRBqIAE2AgAgAEEUaiABQc+Moo4GajYCAAvDBAEGfyABIAJqIQYgAEEYaiEEIABBKGooAgAhAyAAIAAoAgAgAmo2AgAgAEEEaiIFIAUoAgAgAkEQTyAAKAIAQRBPcnI2AgAgAiADakEQSQRAIAMgBGogASAC/AoAACAAQShqIAIgA2o2AgAPCyADBEAgAyAEaiABQRAgA2siAvwKAAAgAEEIaiIDIAMoAgAgBCgCAEH3lK+veGxqQQ13QbHz3fF5bDYCACAAQQxqIgMgAygCACAEQQRqKAIAQfeUr694bGpBDXdBsfPd8XlsNgIAIABBEGoiAyADKAIAIARBCGooAgBB95Svr3hsakENd0Gx893xeWw2AgAgAEEUaiIDIAMoAgAgBEEMaigCAEH3lK+veGxqQQ13QbHz3fF5bDYCACAAQShqQQA2AgAgASACaiEBCyABIAZBEGtNBEAgBkEQayEIIABBCGooAgAhAiAAQQxqKAIAIQMgAEEQaigCACEFIABBFGooAgAhBwNAIAIgASgCAEH3lK+veGxqQQ13QbHz3fF5bCECIAMgAUEEaiIBKAIAQfeUr694bGpBDXdBsfPd8XlsIQMgBSABQQRqIgEoAgBB95Svr3hsakENd0Gx893xeWwhBSAHIAFBBGoiASgCAEH3lK+veGxqQQ13QbHz3fF5bCEHIAggAUEEaiIBTw0ACyAAQQhqIAI2AgAgAEEMaiADNgIAIABBEGogBTYCACAAQRRqIAc2AgALIAEgBkkEQCAEIAEgBiABayIB/AoAACAAQShqIAE2AgALC2EBAX8gAEEQaigCACEBIABBBGooAgAEfyABQQx3IABBFGooAgBBEndqIABBDGooAgBBB3dqIABBCGooAgBBAXdqBSABQbHP2bIBagsgACgCAGogAEEYaiAAQShqKAIAEAEL/wMCA34BfyAAIAFqIQYgAUEgTwR+IAZBIGshBiACQtbrgu7q/Yn14AB8IQMgAkKxqazBrbjUpj19IQQgAkL56tDQ58mh5OEAfCEFA0AgAyAAKQMAQs/W077Sx6vZQn58Qh+JQoeVr6+Ytt6bnn9+IQMgBCAAQQhqIgApAwBCz9bTvtLHq9lCfnxCH4lCh5Wvr5i23puef34hBCACIABBCGoiACkDAELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fiECIAUgAEEIaiIAKQMAQs/W077Sx6vZQn58Qh+JQoeVr6+Ytt6bnn9+IQUgBiAAQQhqIgBPDQALIAJCDIkgBUISiXwgBEIHiXwgA0IBiXwgA0LP1tO+0ser2UJ+Qh+JQoeVr6+Ytt6bnn9+hUKHla+vmLbem55/fkKdo7Xqg7GNivoAfSAEQs/W077Sx6vZQn5CH4lCh5Wvr5i23puef36FQoeVr6+Ytt6bnn9+Qp2jteqDsY2K+gB9IAJCz9bTvtLHq9lCfkIfiUKHla+vmLbem55/foVCh5Wvr5i23puef35CnaO16oOxjYr6AH0gBULP1tO+0ser2UJ+Qh+JQoeVr6+Ytt6bnn9+hUKHla+vmLbem55/fkKdo7Xqg7GNivoAfQUgAkLFz9my8eW66id8CyABrXwgACABQR9xEAYLhgIAIAEgAmohAgNAIAIgAUEIak8EQCABKQMAQs/W077Sx6vZQn5CH4lCh5Wvr5i23puef34gAIVCG4lCh5Wvr5i23puef35CnaO16oOxjYr6AH0hACABQQhqIQEMAQsLIAFBBGogAk0EQCAAIAE1AgBCh5Wvr5i23puef36FQheJQs/W077Sx6vZQn5C+fPd8Zn2masWfCEAIAFBBGohAQsDQCABIAJJBEAgACABMQAAQsXP2bLx5brqJ36FQguJQoeVr6+Ytt6bnn9+IQAgAUEBaiEBDAELCyAAIABCIYiFQs/W077Sx6vZQn4iACAAQh2IhUL5893xmfaZqxZ+IgAgAEIgiIULTQAgAEEIaiABQtbrgu7q/Yn14AB8NwMAIABBEGogAUKxqazBrbjUpj19NwMAIABBGGogATcDACAAQSBqIAFC+erQ0OfJoeThAHw3AwAL9AQCA38EfiABIAJqIQUgAEEoaiEEIABByABqKAIAIQMgACAAKQMAIAKtfDcDACACIANqQSBJBEAgAyAEaiABIAL8CgAAIABByABqIAIgA2o2AgAPCyADBEAgAyAEaiABQSAgA2siAvwKAAAgAEEIaiIDIAMpAwAgBCkDAELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fjcDACAAQRBqIgMgAykDACAEQQhqKQMAQs/W077Sx6vZQn58Qh+JQoeVr6+Ytt6bnn9+NwMAIABBGGoiAyADKQMAIARBEGopAwBCz9bTvtLHq9lCfnxCH4lCh5Wvr5i23puef343AwAgAEEgaiIDIAMpAwAgBEEYaikDAELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fjcDACAAQcgAakEANgIAIAEgAmohAQsgAUEgaiAFTQRAIAVBIGshAiAAQQhqKQMAIQYgAEEQaikDACEHIABBGGopAwAhCCAAQSBqKQMAIQkDQCAGIAEpAwBCz9bTvtLHq9lCfnxCH4lCh5Wvr5i23puef34hBiAHIAFBCGoiASkDAELP1tO+0ser2UJ+fEIfiUKHla+vmLbem55/fiEHIAggAUEIaiIBKQMAQs/W077Sx6vZQn58Qh+JQoeVr6+Ytt6bnn9+IQggCSABQQhqIgEpAwBCz9bTvtLHq9lCfnxCH4lCh5Wvr5i23puef34hCSACIAFBCGoiAU8NAAsgAEEIaiAGNwMAIABBEGogBzcDACAAQRhqIAg3AwAgAEEgaiAJNwMACyABIAVJBEAgBCABIAUgAWsiAfwKAAAgAEHIAGogATYCAAsLvAIBBX4gAEEYaikDACEBIAApAwAiAkIgWgR+IABBCGopAwAiA0IBiSAAQRBqKQMAIgRCB4l8IAFCDIkgAEEgaikDACIFQhKJfHwgA0LP1tO+0ser2UJ+Qh+JQoeVr6+Ytt6bnn9+hUKHla+vmLbem55/fkKdo7Xqg7GNivoAfSAEQs/W077Sx6vZQn5CH4lCh5Wvr5i23puef36FQoeVr6+Ytt6bnn9+Qp2jteqDsY2K+gB9IAFCz9bTvtLHq9lCfkIfiUKHla+vmLbem55/foVCh5Wvr5i23puef35CnaO16oOxjYr6AH0gBULP1tO+0ser2UJ+Qh+JQoeVr6+Ytt6bnn9+hUKHla+vmLbem55/fkKdo7Xqg7GNivoAfQUgAULFz9my8eW66id8CyACfCAAQShqIAJCH4OnEAYL";

// build/dev/javascript/sketch/xxhash.ffi.mjs
var u32_BYTES = 4;
var u64_BYTES = 8;
var XXH32_STATE_SIZE_BYTES = u32_BYTES + // total_len
u32_BYTES + // large_len
u32_BYTES * 4 + // Accumulator lanes
u32_BYTES * 4 + // Internal buffer
u32_BYTES + // memsize
u32_BYTES;
var XXH64_STATE_SIZE_BYTES = u64_BYTES + // total_len
u64_BYTES * 4 + // Accumulator lanes
u64_BYTES * 4 + // Internal buffer
u32_BYTES + // memsize
u32_BYTES + // reserved32
u64_BYTES;
function xxhash() {
  const bytes = Uint8Array.from(atob(wasmBytes), (c) => c.charCodeAt(0));
  const mod = new WebAssembly.Module(bytes);
  const {
    exports: {
      mem,
      xxh32,
      xxh64,
      init32,
      update32,
      digest32,
      init64,
      update64,
      digest64
    }
  } = new WebAssembly.Instance(mod);
  let memory = new Uint8Array(mem.buffer);
  function growMemory(length4, offset) {
    if (mem.buffer.byteLength < length4 + offset) {
      const extraPages = Math.ceil(
        // Wasm pages are spec'd to 64K
        (length4 + offset - mem.buffer.byteLength) / (64 * 1024)
      );
      mem.grow(extraPages);
      memory = new Uint8Array(mem.buffer);
    }
  }
  function create2(size, seed, init3, update2, digest, finalize) {
    growMemory(size);
    const state = new Uint8Array(size);
    memory.set(state);
    init3(0, seed);
    state.set(memory.slice(0, size));
    return {
      update(input2) {
        memory.set(state);
        let length4;
        if (typeof input2 === "string") {
          growMemory(input2.length * 3, size);
          length4 = encoder.encodeInto(input2, memory.subarray(size)).written;
        } else {
          growMemory(input2.byteLength, size);
          memory.set(input2, size);
          length4 = input2.byteLength;
        }
        update2(0, size, length4);
        state.set(memory.slice(0, size));
        return this;
      },
      digest() {
        memory.set(state);
        return finalize(digest(0));
      }
    };
  }
  function forceUnsigned32(i) {
    return i >>> 0;
  }
  const u64Max = 2n ** 64n - 1n;
  function forceUnsigned64(i) {
    return i & u64Max;
  }
  const encoder = new TextEncoder();
  const defaultSeed = 0;
  const defaultBigSeed = 0n;
  function h32(str, seed = defaultSeed) {
    growMemory(str.length * 3, 0);
    return forceUnsigned32(
      xxh32(0, encoder.encodeInto(str, memory).written, seed)
    );
  }
  function h64(str, seed = defaultBigSeed) {
    growMemory(str.length * 3, 0);
    return forceUnsigned64(
      xxh64(0, encoder.encodeInto(str, memory).written, seed)
    );
  }
  return {
    h32,
    h32ToString(str, seed = defaultSeed) {
      return h32(str, seed).toString(16).padStart(8, "0");
    },
    h32Raw(inputBuffer, seed = defaultSeed) {
      growMemory(inputBuffer.byteLength, 0);
      memory.set(inputBuffer);
      return forceUnsigned32(xxh32(0, inputBuffer.byteLength, seed));
    },
    create32(seed = defaultSeed) {
      return create2(
        XXH32_STATE_SIZE_BYTES,
        seed,
        init32,
        update32,
        digest32,
        forceUnsigned32
      );
    },
    h64,
    h64ToString(str, seed = defaultBigSeed) {
      return h64(str, seed).toString(16).padStart(16, "0");
    },
    h64Raw(inputBuffer, seed = defaultBigSeed) {
      growMemory(inputBuffer.byteLength, 0);
      memory.set(inputBuffer);
      return forceUnsigned64(xxh64(0, inputBuffer.byteLength, seed));
    },
    create64(seed = defaultBigSeed) {
      return create2(
        XXH64_STATE_SIZE_BYTES,
        seed,
        init64,
        update64,
        digest64,
        forceUnsigned64
      );
    }
  };
}
var hasher = xxhash();
function xxHash32(content) {
  return hasher.h32(content);
}

// build/dev/javascript/sketch/sketch/internals/style.mjs
var Class = class extends CustomType {
  constructor(string_representation, content) {
    super();
    this.string_representation = string_representation;
    this.content = content;
  }
};
var EphemeralCache = class extends CustomType {
  constructor(cache2) {
    super();
    this.cache = cache2;
  }
};
var PersistentCache = class extends CustomType {
  constructor(cache2, current_id) {
    super();
    this.cache = cache2;
    this.current_id = current_id;
  }
};
var Media = class extends CustomType {
  constructor(query, styles) {
    super();
    this.query = query;
    this.styles = styles;
  }
};
var PseudoSelector = class extends CustomType {
  constructor(pseudo_selector2, styles) {
    super();
    this.pseudo_selector = pseudo_selector2;
    this.styles = styles;
  }
};
var Property = class extends CustomType {
  constructor(key2, value4, important) {
    super();
    this.key = key2;
    this.value = value4;
    this.important = important;
  }
};
var NoStyle = class extends CustomType {
};
var ComputedProperties = class extends CustomType {
  constructor(properties, medias, pseudo_selectors, indent2) {
    super();
    this.properties = properties;
    this.medias = medias;
    this.pseudo_selectors = pseudo_selectors;
    this.indent = indent2;
  }
};
var MediaProperty = class extends CustomType {
  constructor(query, properties, pseudo_selectors) {
    super();
    this.query = query;
    this.properties = properties;
    this.pseudo_selectors = pseudo_selectors;
  }
};
var PseudoProperty = class extends CustomType {
  constructor(pseudo_selector2, properties) {
    super();
    this.pseudo_selector = pseudo_selector2;
    this.properties = properties;
  }
};
var ComputedClass = class extends CustomType {
  constructor(class_def, medias_def, selectors_def, name) {
    super();
    this.class_def = class_def;
    this.medias_def = medias_def;
    this.selectors_def = selectors_def;
    this.name = name;
  }
};
function persistent() {
  return new PersistentCache(new$(), 0);
}
function ephemeral() {
  return new EphemeralCache(new$());
}
function compute_property(indent2, key2, value4, important) {
  let base_indent = indent(indent2);
  let important_ = (() => {
    if (important) {
      return " !important";
    } else {
      return "";
    }
  })();
  return base_indent + key2 + ": " + value4 + important_ + ";";
}
function init_computed_properties(indent2) {
  return new ComputedProperties(toList([]), toList([]), toList([]), indent2);
}
function merge_computed_properties(target2, argument) {
  return new ComputedProperties(
    append(argument.properties, target2.properties),
    append(argument.medias, target2.medias),
    append(argument.pseudo_selectors, target2.pseudo_selectors),
    target2.indent
  );
}
function handle_property(props, style3) {
  if (!(style3 instanceof Property)) {
    throw makeError(
      "let_assert",
      "sketch/internals/style",
      133,
      "handle_property",
      "Pattern match failed, no pattern matched the value.",
      { value: style3 }
    );
  }
  let key2 = style3.key;
  let value4 = style3.value;
  let important = style3.important;
  let css_property = compute_property(props.indent, key2, value4, important);
  let properties = prepend(css_property, props.properties);
  return props.withFields({ properties });
}
function wrap_pseudo_selectors(id2, indent2, pseudo_selectors) {
  return map3(
    pseudo_selectors,
    (p) => {
      return wrap_class(
        id2,
        p.properties,
        indent2,
        new Some(p.pseudo_selector)
      );
    }
  );
}
function compute_classes(class_name4, computed_properties) {
  let properties = computed_properties.properties;
  let medias = computed_properties.medias;
  let pseudo_selectors = computed_properties.pseudo_selectors;
  let class_def = wrap_class(
    class_name4,
    properties,
    0,
    new None()
  );
  let medias_def = map3(
    medias,
    (_use0) => {
      let query = _use0.query;
      let properties$1 = _use0.properties;
      let pseudo_selectors$1 = _use0.pseudo_selectors;
      let selectors_def2 = wrap_pseudo_selectors(
        class_name4,
        2,
        pseudo_selectors$1
      );
      let _pipe = toList([
        query + " {",
        wrap_class(class_name4, properties$1, 2, new None())
      ]);
      let _pipe$1 = ((_capture) => {
        return prepend2(toList([selectors_def2, toList(["}"])]), _capture);
      })(_pipe);
      let _pipe$2 = flatten(_pipe$1);
      return join2(_pipe$2, "\n");
    }
  );
  let selectors_def = wrap_pseudo_selectors(class_name4, 0, pseudo_selectors);
  let name = class_name4;
  return new ComputedClass(class_def, medias_def, selectors_def, name);
}
function class$2(styles) {
  let string_representation = inspect2(styles);
  return new Class(string_representation, styles);
}
function render_cache_dict(cache2) {
  let _pipe = values(cache2);
  let _pipe$1 = flat_map(
    _pipe,
    (c) => {
      return definitions(c[0]);
    }
  );
  return join2(_pipe$1, "\n\n");
}
function render(cache2) {
  if (cache2 instanceof EphemeralCache) {
    let cache$1 = cache2.cache;
    return render_cache_dict(cache$1);
  } else {
    let cache$1 = cache2.cache;
    return render_cache_dict(cache$1);
  }
}
function handle_media(cache2, props, style3) {
  if (!(style3 instanceof Media)) {
    throw makeError(
      "let_assert",
      "sketch/internals/style",
      140,
      "handle_media",
      "Pattern match failed, no pattern matched the value.",
      { value: style3 }
    );
  }
  let query = style3.query;
  let styles = style3.styles;
  let $ = compute_properties(cache2, styles, props.indent + 2);
  let cache$1 = $[0];
  let computed_props = $[1];
  let _pipe = new MediaProperty(
    query,
    computed_props.properties,
    computed_props.pseudo_selectors
  );
  let _pipe$1 = ((_capture) => {
    return prepend2(props.medias, _capture);
  })(
    _pipe
  );
  let _pipe$2 = ((m) => {
    return props.withFields({ medias: m });
  })(_pipe$1);
  return ((_capture) => {
    return new$2(cache$1, _capture);
  })(_pipe$2);
}
function compute_properties(cache2, properties, indent2) {
  let init3 = init_computed_properties(indent2);
  return fold(
    reverse(properties),
    [cache2, init3],
    (_use0, prop) => {
      let cache$1 = _use0[0];
      let acc = _use0[1];
      if (prop instanceof NoStyle) {
        return [cache$1, acc];
      } else if (prop instanceof Property) {
        return [cache$1, handle_property(acc, prop)];
      } else if (prop instanceof Media) {
        return handle_media(cache$1, acc, prop);
      } else if (prop instanceof PseudoSelector) {
        return handle_pseudo_selector(cache$1, acc, prop);
      } else {
        let class$1 = prop.class_name;
        let $ = get(cache$1.cache, class$1.string_representation);
        if ($.isOk()) {
          let props = $[0][1];
          return [cache$1, merge_computed_properties(acc, props)];
        } else {
          let _pipe = compute_properties(cache$1, class$1.content, indent2);
          return map_second(
            _pipe,
            (_capture) => {
              return merge_computed_properties(acc, _capture);
            }
          );
        }
      }
    }
  );
}
function handle_pseudo_selector(cache2, props, style3) {
  if (!(style3 instanceof PseudoSelector)) {
    throw makeError(
      "let_assert",
      "sketch/internals/style",
      154,
      "handle_pseudo_selector",
      "Pattern match failed, no pattern matched the value.",
      { value: style3 }
    );
  }
  let pseudo_selector2 = style3.pseudo_selector;
  let styles = style3.styles;
  let $ = compute_properties(cache2, styles, props.indent + 2);
  let cache$1 = $[0];
  let computed_props = $[1];
  let _pipe = new PseudoProperty(pseudo_selector2, computed_props.properties);
  let _pipe$1 = ((_capture) => {
    return prepend2(computed_props.pseudo_selectors, _capture);
  })(_pipe);
  let _pipe$2 = append(_pipe$1, props.pseudo_selectors);
  let _pipe$3 = ((p) => {
    return props.withFields({ pseudo_selectors: p });
  })(
    _pipe$2
  );
  return ((_capture) => {
    return new$2(cache$1, _capture);
  })(_pipe$3);
}
function compute_class(cache2, class$4) {
  let string_representation = class$4.string_representation;
  let content = class$4.content;
  let $ = compute_properties(cache2, content, 2);
  let cache$1 = $[0];
  let properties = $[1];
  let class_id = (() => {
    if (cache$1 instanceof EphemeralCache) {
      return xxHash32(string_representation);
    } else {
      let cid = cache$1.current_id;
      return cid;
    }
  })();
  let class_name$1 = "css-" + to_string3(class_id);
  let _pipe = compute_classes(class_name$1, properties);
  let _pipe$1 = ((c) => {
    return create(
      c.name,
      class_id,
      new None(),
      new Definitions(c.medias_def, c.selectors_def, c.class_def)
    );
  })(_pipe);
  return ((class$5) => {
    let c = insert(
      cache$1.cache,
      string_representation,
      [class$5, properties]
    );
    let _pipe$2 = (() => {
      if (cache$1 instanceof EphemeralCache) {
        return new EphemeralCache(c);
      } else {
        return new PersistentCache(c, class_id + 1);
      }
    })();
    return new$2(_pipe$2, class$5);
  })(_pipe$1);
}
function class_name2(class$4, cache2) {
  let s = class$4.string_representation;
  let c = class$4.content;
  return guard(
    is_empty(c),
    [cache2, ""],
    () => {
      let $ = get(cache2.cache, s);
      if ($.isOk()) {
        let content = $[0][0];
        return [cache2, class_name(content)];
      } else {
        let _pipe = compute_class(cache2, class$4);
        return map_second(_pipe, class_name);
      }
    }
  );
}

// build/dev/javascript/sketch/sketch/size.mjs
var Px = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Pt = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Vh = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Vw = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Em = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Rem = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Lh = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Rlh = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Pct = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
function percent(value4) {
  return new Pct(to_float(value4));
}
function rem(value4) {
  return new Rem(value4);
}
function to_string7(size) {
  if (size instanceof Px) {
    let value4 = size[0];
    return append3(to_string2(value4), "px");
  } else if (size instanceof Pt) {
    let value4 = size[0];
    return append3(to_string2(value4), "pt");
  } else if (size instanceof Pct) {
    let value4 = size[0];
    return append3(to_string2(value4), "%");
  } else if (size instanceof Vh) {
    let value4 = size[0];
    return append3(to_string2(value4), "vh");
  } else if (size instanceof Vw) {
    let value4 = size[0];
    return append3(to_string2(value4), "vw");
  } else if (size instanceof Em) {
    let value4 = size[0];
    return append3(to_string2(value4), "em");
  } else if (size instanceof Rem) {
    let value4 = size[0];
    return append3(to_string2(value4), "rem");
  } else if (size instanceof Lh) {
    let value4 = size[0];
    return append3(to_string2(value4), "lh");
  } else if (size instanceof Rlh) {
    let value4 = size[0];
    return append3(to_string2(value4), "rlh");
  } else {
    let value4 = size[0];
    return append3(to_string2(value4), "ch");
  }
}

// build/dev/javascript/sketch/sketch.mjs
var JsCache = class extends CustomType {
  constructor(cache2) {
    super();
    this.cache = cache2;
  }
};
var Ephemeral = class extends CustomType {
};
function class$3(styles) {
  return class$2(styles);
}
function render2(cache2) {
  if (!(cache2 instanceof JsCache)) {
    throw makeError(
      "let_assert",
      "sketch",
      38,
      "render",
      "Pattern match failed, no pattern matched the value.",
      { value: cache2 }
    );
  }
  let cache$1 = cache2.cache;
  return render(cache$1);
}
function class_name3(class$4, cache2) {
  if (!(cache2 instanceof JsCache)) {
    throw makeError(
      "let_assert",
      "sketch",
      53,
      "class_name",
      "Pattern match failed, no pattern matched the value.",
      { value: cache2 }
    );
  }
  let c = cache2.cache;
  let _pipe = class_name2(class$4, c);
  return map_first(_pipe, (var0) => {
    return new JsCache(var0);
  });
}
function cache(strategy) {
  return new Ok(
    (() => {
      if (strategy instanceof Ephemeral) {
        return new JsCache(ephemeral());
      } else {
        return new JsCache(persistent());
      }
    })()
  );
}
function property(field2, content) {
  return new Property(field2, content, false);
}
function align_items(align) {
  return property("align-items", align);
}
function background_color(value4) {
  return property("background-color", value4);
}
function border(border2) {
  return property("border", border2);
}
function border_radius(border_radius2) {
  return property("border-radius", to_string7(border_radius2));
}
function box_shadow(box_shadow2) {
  return property("box-shadow", box_shadow2);
}
function color(color2) {
  return property("color", color2);
}
function cursor(cursor2) {
  return property("cursor", cursor2);
}
function display(display2) {
  return property("display", display2);
}
function flex_direction(flex_direction2) {
  return property("flex-direction", flex_direction2);
}
function flex_shrink(flex_shrink2) {
  return property("flex-shrink", to_string2(flex_shrink2));
}
function font_size(font_size2) {
  return property("font-size", to_string7(font_size2));
}
function font_weight(font_weight2) {
  return property("font-weight", font_weight2);
}
function gap(gap2) {
  return property("gap", to_string7(gap2));
}
function justify_content(justify) {
  return property("justify-content", justify);
}
function letter_spacing(letter_spacing2) {
  return property("letter-spacing", letter_spacing2);
}
function line_height(line_height2) {
  return property("line-height", line_height2);
}
function margin_(margin) {
  return property("margin", margin);
}
function max_width(width2) {
  return property("max-width", to_string7(width2));
}
function outline(outline2) {
  return property("outline", outline2);
}
function overflow(overflow2) {
  return property("overflow", overflow2);
}
function overflow_x(overflow_x2) {
  return property("overflow-x", overflow_x2);
}
function padding(padding2) {
  return property("padding", to_string7(padding2));
}
function padding_(padding2) {
  return property("padding", padding2);
}
function text_align(text_align2) {
  return property("text-align", text_align2);
}
function text_overflow(text_overflow2) {
  return property("text-overflow", text_overflow2);
}
function text_transform(text_transform2) {
  return property("text-transform", text_transform2);
}
function transform(transform2) {
  return property("transform", transform2);
}
function transition(transition2) {
  return property("transition", transition2);
}
function white_space(white_space2) {
  return property("white-space", white_space2);
}
function width(width2) {
  return property("width", to_string7(width2));
}
function pseudo_selector(value4, styles) {
  return new PseudoSelector(value4, styles);
}
function hover(styles) {
  return pseudo_selector(":hover", styles);
}
function focus(styles) {
  return pseudo_selector(":focus", styles);
}

// build/dev/javascript/sketch_lustre/sketch_lustre.ffi.mjs
function wrap(current) {
  if (isPersistent(current))
    return { current };
  return current;
}
function set(variable, newValue) {
  if (!("current" in variable))
    return newValue;
  variable.current = newValue;
  return variable;
}
function get2(variable) {
  if ("current" in variable)
    return variable.current;
  return variable;
}
function isPersistent(cache2) {
  return "cache" in cache2 && "current_id" in cache2.cache;
}
function createCssStyleSheet(root) {
  const stylesheet = new CSSStyleSheet();
  if (root && root.adoptedStyleSheets) {
    root.adoptedStyleSheets.push(stylesheet);
  } else {
    document.adoptedStyleSheets.push(stylesheet);
  }
  return stylesheet;
}
function setStylesheet(content, stylesheet) {
  stylesheet.replaceSync(content);
}

// build/dev/javascript/sketch_lustre/sketch/lustre/element.mjs
var Nothing = class extends CustomType {
};
var Text2 = class extends CustomType {
  constructor(content) {
    super();
    this.content = content;
  }
};
var Map3 = class extends CustomType {
  constructor(subtree) {
    super();
    this.subtree = subtree;
  }
};
var Element3 = class extends CustomType {
  constructor(key2, namespace, tag, class$4, attributes, children2) {
    super();
    this.key = key2;
    this.namespace = namespace;
    this.tag = tag;
    this.class = class$4;
    this.attributes = attributes;
    this.children = children2;
  }
};
function text2(content) {
  return new Text2(content);
}
function element2(tag, class$4, attributes, children2) {
  let class$1 = new Some(class$4);
  return new Element3("", "", tag, class$1, attributes, children2);
}
function fragment2(children2) {
  let attrs = toList([style(toList([["display", "contents"]]))]);
  return new Element3(
    "",
    "",
    "lustre-fragment",
    new None(),
    attrs,
    children2
  );
}
function unstyled_children(cache2, children2) {
  return fold(
    reverse(children2),
    [cache2, toList([])],
    (acc, child) => {
      let cache$1 = acc[0];
      let children$1 = acc[1];
      let $ = unstyled(cache$1, child);
      let cache$2 = $[0];
      let child$1 = $[1];
      return [cache$2, prepend(child$1, children$1)];
    }
  );
}
function unstyled(loop$cache, loop$element) {
  while (true) {
    let cache2 = loop$cache;
    let element3 = loop$element;
    if (element3 instanceof Nothing) {
      return [cache2, none2()];
    } else if (element3 instanceof Text2) {
      let content = element3.content;
      return [cache2, text(content)];
    } else if (element3 instanceof Map3) {
      let subtree = element3.subtree;
      loop$cache = cache2;
      loop$element = subtree();
    } else {
      let key2 = element3.key;
      let namespace = element3.namespace;
      let tag = element3.tag;
      let class$4 = element3.class;
      let attributes = element3.attributes;
      let children2 = element3.children;
      let class$1 = map2(
        class$4,
        (_capture) => {
          return class_name3(_capture, cache2);
        }
      );
      let class_name4 = map2(class$1, second);
      let cache$1 = (() => {
        let _pipe = map2(class$1, first);
        return unwrap(_pipe, cache2);
      })();
      let $ = unstyled_children(cache$1, children2);
      let cache$2 = $[0];
      let children$1 = $[1];
      let attributes$1 = (() => {
        if (class_name4 instanceof None) {
          return attributes;
        } else {
          let class_name$1 = class_name4[0];
          let class_name$2 = class$(class_name$1);
          return prepend(class_name$2, attributes);
        }
      })();
      return [
        cache$2,
        (() => {
          let $1 = element(tag, attributes$1, children$1);
          if ($1 instanceof Element2) {
            let t = $1.tag;
            let a = $1.attrs;
            let c = $1.children;
            let s = $1.self_closing;
            let v = $1.void;
            return new Element2(key2, namespace, t, a, c, s, v);
          } else {
            let e = $1;
            return e;
          }
        })()
      ];
    }
  }
}

// build/dev/javascript/sketch_lustre/sketch/lustre.mjs
var Node2 = class extends CustomType {
};
var Document = class extends CustomType {
};
var Options = class extends CustomType {
  constructor(stylesheet) {
    super();
    this.stylesheet = stylesheet;
  }
};
var CssStyleSheet = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var NodeStyleSheet = class extends CustomType {
};
function to_stylesheet(options) {
  if (options instanceof Options && options.stylesheet instanceof Node2) {
    return new NodeStyleSheet();
  } else if (options instanceof Options && options.stylesheet instanceof Document) {
    return new CssStyleSheet(createCssStyleSheet());
  } else {
    let root = options.stylesheet.root;
    return new CssStyleSheet(createCssStyleSheet(root));
  }
}
function render_stylesheet(content, node2, stylesheet) {
  if (stylesheet instanceof NodeStyleSheet) {
    if (node2 instanceof Element2 && node2.tag === "lustre-fragment") {
      let children2 = node2.children;
      return fragment(
        prepend(
          element("style", toList([]), toList([text(content)])),
          children2
        )
      );
    } else {
      return fragment(
        toList([
          element("style", toList([]), toList([text(content)])),
          node2
        ])
      );
    }
  } else {
    let stylesheet$1 = stylesheet[0];
    setStylesheet(content, stylesheet$1);
    return node2;
  }
}
function compose(options, view2, cache2) {
  let cache$1 = wrap(cache2);
  let stylesheet = to_stylesheet(options);
  return (model) => {
    let node$1 = view2(model);
    let $ = unstyled(get2(cache$1), node$1);
    let result = $[0];
    let node$2 = $[1];
    let content = render2(result);
    set(cache$1, result);
    return render_stylesheet(content, node$2, stylesheet);
  };
}
function node() {
  return new Options(new Node2());
}

// build/dev/javascript/sketch_lustre/sketch/lustre/element/html.mjs
function text3(content) {
  return text2(content);
}
function button(class$4, attributes, children2) {
  return element2("button", class$4, attributes, children2);
}
function div(class$4, attributes, children2) {
  return element2("div", class$4, attributes, children2);
}
function input(class$4, attributes) {
  return element2("input", class$4, attributes, toList([]));
}

// node_modules/partysocket/dist/chunk-4SNNYC7I.mjs
if (!globalThis.EventTarget || !globalThis.Event) {
  console.error(`
  PartySocket requires a global 'EventTarget' class to be available!
  You can polyfill this global by adding this to your code before any partysocket imports: 
  
  \`\`\`
  import 'partysocket/event-target-polyfill';
  \`\`\`
  Please file an issue at https://github.com/partykit/partykit if you're still having trouble.
`);
}
var ErrorEvent = class extends Event {
  message;
  error;
  constructor(error, target2) {
    super("error", target2);
    this.message = error.message;
    this.error = error;
  }
};
var CloseEvent = class extends Event {
  code;
  reason;
  wasClean = true;
  constructor(code2 = 1e3, reason = "", target2) {
    super("close", target2);
    this.code = code2;
    this.reason = reason;
  }
};
var Events = {
  Event,
  ErrorEvent,
  CloseEvent
};
function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg);
  }
}
function cloneEventBrowser(e) {
  return new e.constructor(e.type, e);
}
function cloneEventNode(e) {
  if ("data" in e) {
    const evt2 = new MessageEvent(e.type, e);
    return evt2;
  }
  if ("code" in e || "reason" in e) {
    const evt2 = new CloseEvent(
      // @ts-expect-error we need to fix event/listener types
      e.code || 1999,
      // @ts-expect-error we need to fix event/listener types
      e.reason || "unknown reason",
      e
    );
    return evt2;
  }
  if ("error" in e) {
    const evt2 = new ErrorEvent(e.error, e);
    return evt2;
  }
  const evt = new Event(e.type, e);
  return evt;
}
var isNode = typeof process !== "undefined" && typeof process.versions?.node !== "undefined" && typeof document === "undefined";
var cloneEvent = isNode ? cloneEventNode : cloneEventBrowser;
var DEFAULT = {
  maxReconnectionDelay: 1e4,
  minReconnectionDelay: 1e3 + Math.random() * 4e3,
  minUptime: 5e3,
  reconnectionDelayGrowFactor: 1.3,
  connectionTimeout: 4e3,
  maxRetries: Infinity,
  maxEnqueuedMessages: Infinity,
  startClosed: false,
  debug: false
};
var didWarnAboutMissingWebSocket = false;
var ReconnectingWebSocket = class _ReconnectingWebSocket extends EventTarget {
  _ws;
  _retryCount = -1;
  _uptimeTimeout;
  _connectTimeout;
  _shouldReconnect = true;
  _connectLock = false;
  _binaryType = "blob";
  _closeCalled = false;
  _messageQueue = [];
  _debugLogger = console.log.bind(console);
  _url;
  _protocols;
  _options;
  constructor(url, protocols, options = {}) {
    super();
    this._url = url;
    this._protocols = protocols;
    this._options = options;
    if (this._options.startClosed) {
      this._shouldReconnect = false;
    }
    if (this._options.debugLogger) {
      this._debugLogger = this._options.debugLogger;
    }
    this._connect();
  }
  static get CONNECTING() {
    return 0;
  }
  static get OPEN() {
    return 1;
  }
  static get CLOSING() {
    return 2;
  }
  static get CLOSED() {
    return 3;
  }
  get CONNECTING() {
    return _ReconnectingWebSocket.CONNECTING;
  }
  get OPEN() {
    return _ReconnectingWebSocket.OPEN;
  }
  get CLOSING() {
    return _ReconnectingWebSocket.CLOSING;
  }
  get CLOSED() {
    return _ReconnectingWebSocket.CLOSED;
  }
  get binaryType() {
    return this._ws ? this._ws.binaryType : this._binaryType;
  }
  set binaryType(value4) {
    this._binaryType = value4;
    if (this._ws) {
      this._ws.binaryType = value4;
    }
  }
  /**
   * Returns the number or connection retries
   */
  get retryCount() {
    return Math.max(this._retryCount, 0);
  }
  /**
   * The number of bytes of data that have been queued using calls to send() but not yet
   * transmitted to the network. This value resets to zero once all queued data has been sent.
   * This value does not reset to zero when the connection is closed; if you keep calling send(),
   * this will continue to climb. Read only
   */
  get bufferedAmount() {
    const bytes = this._messageQueue.reduce((acc, message) => {
      if (typeof message === "string") {
        acc += message.length;
      } else if (message instanceof Blob) {
        acc += message.size;
      } else {
        acc += message.byteLength;
      }
      return acc;
    }, 0);
    return bytes + (this._ws ? this._ws.bufferedAmount : 0);
  }
  /**
   * The extensions selected by the server. This is currently only the empty string or a list of
   * extensions as negotiated by the connection
   */
  get extensions() {
    return this._ws ? this._ws.extensions : "";
  }
  /**
   * A string indicating the name of the sub-protocol the server selected;
   * this will be one of the strings specified in the protocols parameter when creating the
   * WebSocket object
   */
  get protocol() {
    return this._ws ? this._ws.protocol : "";
  }
  /**
   * The current state of the connection; this is one of the Ready state constants
   */
  get readyState() {
    if (this._ws) {
      return this._ws.readyState;
    }
    return this._options.startClosed ? _ReconnectingWebSocket.CLOSED : _ReconnectingWebSocket.CONNECTING;
  }
  /**
   * The URL as resolved by the constructor
   */
  get url() {
    return this._ws ? this._ws.url : "";
  }
  /**
   * Whether the websocket object is now in reconnectable state
   */
  get shouldReconnect() {
    return this._shouldReconnect;
  }
  /**
   * An event listener to be called when the WebSocket connection's readyState changes to CLOSED
   */
  onclose = null;
  /**
   * An event listener to be called when an error occurs
   */
  onerror = null;
  /**
   * An event listener to be called when a message is received from the server
   */
  onmessage = null;
  /**
   * An event listener to be called when the WebSocket connection's readyState changes to OPEN;
   * this indicates that the connection is ready to send and receive data
   */
  onopen = null;
  /**
   * Closes the WebSocket connection or connection attempt, if any. If the connection is already
   * CLOSED, this method does nothing
   */
  close(code2 = 1e3, reason) {
    this._closeCalled = true;
    this._shouldReconnect = false;
    this._clearTimeouts();
    if (!this._ws) {
      this._debug("close enqueued: no ws instance");
      return;
    }
    if (this._ws.readyState === this.CLOSED) {
      this._debug("close: already closed");
      return;
    }
    this._ws.close(code2, reason);
  }
  /**
   * Closes the WebSocket connection or connection attempt and connects again.
   * Resets retry counter;
   */
  reconnect(code2, reason) {
    this._shouldReconnect = true;
    this._closeCalled = false;
    this._retryCount = -1;
    if (!this._ws || this._ws.readyState === this.CLOSED) {
      this._connect();
    } else {
      this._disconnect(code2, reason);
      this._connect();
    }
  }
  /**
   * Enqueue specified data to be transmitted to the server over the WebSocket connection
   */
  send(data) {
    if (this._ws && this._ws.readyState === this.OPEN) {
      this._debug("send", data);
      this._ws.send(data);
    } else {
      const { maxEnqueuedMessages = DEFAULT.maxEnqueuedMessages } = this._options;
      if (this._messageQueue.length < maxEnqueuedMessages) {
        this._debug("enqueue", data);
        this._messageQueue.push(data);
      }
    }
  }
  _debug(...args) {
    if (this._options.debug) {
      this._debugLogger("RWS>", ...args);
    }
  }
  _getNextDelay() {
    const {
      reconnectionDelayGrowFactor = DEFAULT.reconnectionDelayGrowFactor,
      minReconnectionDelay = DEFAULT.minReconnectionDelay,
      maxReconnectionDelay = DEFAULT.maxReconnectionDelay
    } = this._options;
    let delay = 0;
    if (this._retryCount > 0) {
      delay = minReconnectionDelay * Math.pow(reconnectionDelayGrowFactor, this._retryCount - 1);
      if (delay > maxReconnectionDelay) {
        delay = maxReconnectionDelay;
      }
    }
    this._debug("next delay", delay);
    return delay;
  }
  _wait() {
    return new Promise((resolve2) => {
      setTimeout(resolve2, this._getNextDelay());
    });
  }
  _getNextProtocols(protocolsProvider) {
    if (!protocolsProvider)
      return Promise.resolve(null);
    if (typeof protocolsProvider === "string" || Array.isArray(protocolsProvider)) {
      return Promise.resolve(protocolsProvider);
    }
    if (typeof protocolsProvider === "function") {
      const protocols = protocolsProvider();
      if (!protocols)
        return Promise.resolve(null);
      if (typeof protocols === "string" || Array.isArray(protocols)) {
        return Promise.resolve(protocols);
      }
      if (protocols.then) {
        return protocols;
      }
    }
    throw Error("Invalid protocols");
  }
  _getNextUrl(urlProvider) {
    if (typeof urlProvider === "string") {
      return Promise.resolve(urlProvider);
    }
    if (typeof urlProvider === "function") {
      const url = urlProvider();
      if (typeof url === "string") {
        return Promise.resolve(url);
      }
      if (url.then) {
        return url;
      }
    }
    throw Error("Invalid URL");
  }
  _connect() {
    if (this._connectLock || !this._shouldReconnect) {
      return;
    }
    this._connectLock = true;
    const {
      maxRetries = DEFAULT.maxRetries,
      connectionTimeout = DEFAULT.connectionTimeout
    } = this._options;
    if (this._retryCount >= maxRetries) {
      this._debug("max retries reached", this._retryCount, ">=", maxRetries);
      return;
    }
    this._retryCount++;
    this._debug("connect", this._retryCount);
    this._removeListeners();
    this._wait().then(
      () => Promise.all([
        this._getNextUrl(this._url),
        this._getNextProtocols(this._protocols || null)
      ])
    ).then(([url, protocols]) => {
      if (this._closeCalled) {
        this._connectLock = false;
        return;
      }
      if (!this._options.WebSocket && typeof WebSocket === "undefined" && !didWarnAboutMissingWebSocket) {
        console.error(`\u203C\uFE0F No WebSocket implementation available. You should define options.WebSocket. 

For example, if you're using node.js, run \`npm install ws\`, and then in your code:

import PartySocket from 'partysocket';
import WS from 'ws';

const partysocket = new PartySocket({
  host: "127.0.0.1:1999",
  room: "test-room",
  WebSocket: WS
});

`);
        didWarnAboutMissingWebSocket = true;
      }
      const WS = this._options.WebSocket || WebSocket;
      this._debug("connect", { url, protocols });
      this._ws = protocols ? new WS(url, protocols) : new WS(url);
      this._ws.binaryType = this._binaryType;
      this._connectLock = false;
      this._addListeners();
      this._connectTimeout = setTimeout(
        () => this._handleTimeout(),
        connectionTimeout
      );
    }).catch((err) => {
      this._connectLock = false;
      this._handleError(new Events.ErrorEvent(Error(err.message), this));
    });
  }
  _handleTimeout() {
    this._debug("timeout event");
    this._handleError(new Events.ErrorEvent(Error("TIMEOUT"), this));
  }
  _disconnect(code2 = 1e3, reason) {
    this._clearTimeouts();
    if (!this._ws) {
      return;
    }
    this._removeListeners();
    try {
      this._ws.close(code2, reason);
      this._handleClose(new Events.CloseEvent(code2, reason, this));
    } catch (error) {
    }
  }
  _acceptOpen() {
    this._debug("accept open");
    this._retryCount = 0;
  }
  _handleOpen = (event2) => {
    this._debug("open event");
    const { minUptime = DEFAULT.minUptime } = this._options;
    clearTimeout(this._connectTimeout);
    this._uptimeTimeout = setTimeout(() => this._acceptOpen(), minUptime);
    assert(this._ws, "WebSocket is not defined");
    this._ws.binaryType = this._binaryType;
    this._messageQueue.forEach((message) => this._ws?.send(message));
    this._messageQueue = [];
    if (this.onopen) {
      this.onopen(event2);
    }
    this.dispatchEvent(cloneEvent(event2));
  };
  _handleMessage = (event2) => {
    this._debug("message event");
    if (this.onmessage) {
      this.onmessage(event2);
    }
    this.dispatchEvent(cloneEvent(event2));
  };
  _handleError = (event2) => {
    this._debug("error event", event2.message);
    this._disconnect(
      void 0,
      event2.message === "TIMEOUT" ? "timeout" : void 0
    );
    if (this.onerror) {
      this.onerror(event2);
    }
    this._debug("exec error listeners");
    this.dispatchEvent(cloneEvent(event2));
    this._connect();
  };
  _handleClose = (event2) => {
    this._debug("close event");
    this._clearTimeouts();
    if (this._shouldReconnect) {
      this._connect();
    }
    if (this.onclose) {
      this.onclose(event2);
    }
    this.dispatchEvent(cloneEvent(event2));
  };
  _removeListeners() {
    if (!this._ws) {
      return;
    }
    this._debug("removeListeners");
    this._ws.removeEventListener("open", this._handleOpen);
    this._ws.removeEventListener("close", this._handleClose);
    this._ws.removeEventListener("message", this._handleMessage);
    this._ws.removeEventListener("error", this._handleError);
  }
  _addListeners() {
    if (!this._ws) {
      return;
    }
    this._debug("addListeners");
    this._ws.addEventListener("open", this._handleOpen);
    this._ws.addEventListener("close", this._handleClose);
    this._ws.addEventListener("message", this._handleMessage);
    this._ws.addEventListener("error", this._handleError);
  }
  _clearTimeouts() {
    clearTimeout(this._connectTimeout);
    clearTimeout(this._uptimeTimeout);
  }
};

// node_modules/partysocket/dist/chunk-H3IJA3WK.mjs
var valueIsNotNil = (keyValuePair) => keyValuePair[1] !== null && keyValuePair[1] !== void 0;
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  let d = (/* @__PURE__ */ new Date()).getTime();
  let d2 = typeof performance !== "undefined" && performance.now && performance.now() * 1e3 || 0;
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
}
function getPartyInfo(partySocketOptions, defaultProtocol, defaultParams = {}) {
  const {
    host: rawHost,
    path: rawPath,
    protocol: rawProtocol,
    room,
    party,
    prefix,
    query
  } = partySocketOptions;
  let host = rawHost.replace(/^(http|https|ws|wss):\/\//, "");
  if (host.endsWith("/")) {
    host = host.slice(0, -1);
  }
  if (rawPath && rawPath.startsWith("/")) {
    throw new Error("path must not start with a slash");
  }
  const name = party ?? "main";
  const path = rawPath ? `/${rawPath}` : "";
  const protocol = rawProtocol || (host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host.startsWith("192.168.") || host.startsWith("10.") || host.startsWith("172.") && host.split(".")[1] >= "16" && host.split(".")[1] <= "31" || host.startsWith("[::ffff:7f00:1]:") ? (
    // http / ws
    defaultProtocol
  ) : (
    // https / wss
    defaultProtocol + "s"
  ));
  const baseUrl = `${protocol}://${host}/${prefix || `parties/${name}/${room}`}${path}`;
  const makeUrl = (query2 = {}) => `${baseUrl}?${new URLSearchParams([
    ...Object.entries(defaultParams),
    ...Object.entries(query2).filter(valueIsNotNil)
  ])}`;
  const urlProvider = typeof query === "function" ? async () => makeUrl(await query()) : makeUrl(query);
  return {
    host,
    path,
    room,
    name,
    protocol,
    partyUrl: baseUrl,
    urlProvider
  };
}
var PartySocket = class extends ReconnectingWebSocket {
  constructor(partySocketOptions) {
    const wsOptions = getWSOptions(partySocketOptions);
    super(wsOptions.urlProvider, wsOptions.protocols, wsOptions.socketOptions);
    this.partySocketOptions = partySocketOptions;
    this.setWSProperties(wsOptions);
  }
  _pk;
  _pkurl;
  name;
  room;
  host;
  path;
  updateProperties(partySocketOptions) {
    const wsOptions = getWSOptions({
      ...this.partySocketOptions,
      ...partySocketOptions,
      host: partySocketOptions.host ?? this.host,
      room: partySocketOptions.room ?? this.room,
      path: partySocketOptions.path ?? this.path
    });
    this._url = wsOptions.urlProvider;
    this._protocols = wsOptions.protocols;
    this._options = wsOptions.socketOptions;
    this.setWSProperties(wsOptions);
  }
  setWSProperties(wsOptions) {
    const { _pk, _pkurl, name, room, host, path } = wsOptions;
    this._pk = _pk;
    this._pkurl = _pkurl;
    this.name = name;
    this.room = room;
    this.host = host;
    this.path = path;
  }
  reconnect(code2, reason) {
    if (!this.room || !this.host) {
      throw new Error(
        "The room and host must be set before connecting, use `updateProperties` method to set them or pass them to the constructor."
      );
    }
    super.reconnect(code2, reason);
  }
  get id() {
    return this._pk;
  }
  /**
   * Exposes the static PartyKit room URL without applying query parameters.
   * To access the currently connected WebSocket url, use PartySocket#url.
   */
  get roomUrl() {
    return this._pkurl;
  }
  // a `fetch` method that uses (almost) the same options as `PartySocket`
  static async fetch(options, init3) {
    const party = getPartyInfo(options, "http");
    const url = typeof party.urlProvider === "string" ? party.urlProvider : await party.urlProvider();
    const doFetch = options.fetch ?? fetch;
    return doFetch(url, init3);
  }
};
function getWSOptions(partySocketOptions) {
  const {
    id: id2,
    host: _host,
    path: _path,
    party: _party,
    room: _room,
    protocol: _protocol,
    query: _query,
    protocols,
    ...socketOptions
  } = partySocketOptions;
  const _pk = id2 || generateUUID();
  const party = getPartyInfo(partySocketOptions, "ws", { _pk });
  return {
    _pk,
    _pkurl: party.partyUrl,
    name: party.name,
    room: party.room,
    host: party.host,
    path: party.path,
    protocols,
    socketOptions,
    urlProvider: party.urlProvider
  };
}

// build/dev/javascript/kemotvt/storage.ffi.ts
var partySocket = new PartySocket({
  host: "192.168.8.107:1999",
  room: "my-room"
});
partySocket.addEventListener("message", (e) => {
  window.localStorage.setItem("kanban", e.data);
  let to_do = JSON.parse(e.data)[0];
  let in_progress = JSON.parse(e.data)[1];
  let done = JSON.parse(e.data)[2];
  document.getElementById("websocket_element")?.dispatchEvent(
    new CustomEvent("content-updated", {
      detail: {
        to_do,
        in_progress,
        done
      },
      bubbles: true,
      // Allows the event to bubble up the DOM
      composed: true
      // Allows the event to cross the shadow DOM boundary (if present)
    })
  );
});
function read_local_storage(key2) {
  const value4 = window.localStorage.getItem(key2);
  let string3 = JSON.parse(value4);
  return string3 ? new Ok(string3) : new Error2(void 0);
}
function write_local_storage(key2, value4) {
  const value22 = JSON.stringify(value4);
  partySocket.send(value22);
  window.localStorage.setItem(key2, value22);
}

// build/dev/javascript/kemotvt/kemotvt.mjs
var Model2 = class extends CustomType {
  constructor(to_do, in_progress, done, new_task_input) {
    super();
    this.to_do = to_do;
    this.in_progress = in_progress;
    this.done = done;
    this.new_task_input = new_task_input;
  }
};
var UpdateNewTask = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var AddTask = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var DeleteTask = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var CacheUpdatedMessage = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UserUpdatedContent = class extends CustomType {
  constructor(x0, x1, x2) {
    super();
    this[0] = x0;
    this[1] = x1;
    this[2] = x2;
  }
};
function read_localstorage(key2) {
  return from(
    (dispatch) => {
      let _pipe = read_local_storage(key2);
      let _pipe$1 = new CacheUpdatedMessage(_pipe);
      return dispatch(_pipe$1);
    }
  );
}
function write_localstorage(key2, value4) {
  return from((_) => {
    return write_local_storage(key2, value4);
  });
}
function init2(_) {
  return [
    new Model2(
      new Some(toList([])),
      new Some(toList([])),
      new Some(toList([])),
      ""
    ),
    read_localstorage("kanban")
  ];
}
function update(model, msg) {
  if (msg instanceof UserUpdatedContent) {
    let to_do = msg[0];
    let in_progress = msg[1];
    let done = msg[2];
    return [
      model.withFields({
        to_do: new Some(to_do),
        in_progress: new Some(in_progress),
        done: new Some(done)
      }),
      none()
    ];
  } else if (msg instanceof CacheUpdatedMessage && msg[0].isOk()) {
    let kanban = msg[0][0];
    return [
      model.withFields({
        to_do: new Some(
          (() => {
            let _pipe = kanban;
            let _pipe$1 = index(_pipe, 0);
            let _pipe$2 = lazy_unwrap2(
              _pipe$1,
              () => {
                return toArray(toList([]));
              }
            );
            return to_list(_pipe$2);
          })()
        ),
        in_progress: new Some(
          (() => {
            let _pipe = kanban;
            let _pipe$1 = index(_pipe, 1);
            let _pipe$2 = lazy_unwrap2(
              _pipe$1,
              () => {
                return toArray(toList([]));
              }
            );
            return to_list(_pipe$2);
          })()
        ),
        done: new Some(
          (() => {
            let _pipe = kanban;
            let _pipe$1 = index(_pipe, 2);
            let _pipe$2 = lazy_unwrap2(
              _pipe$1,
              () => {
                return toArray(toList([]));
              }
            );
            return to_list(_pipe$2);
          })()
        )
      }),
      none()
    ];
  } else if (msg instanceof CacheUpdatedMessage && !msg[0].isOk()) {
    return [model, none()];
  } else if (msg instanceof UpdateNewTask) {
    let value4 = msg[0];
    return [model.withFields({ new_task_input: value4 }), none()];
  } else if (msg instanceof DeleteTask) {
    let kanban_block$1 = msg[0];
    let task$1 = msg[1];
    if (kanban_block$1 === "todo") {
      let tasks = (() => {
        let _pipe = model.to_do;
        let _pipe$1 = lazy_unwrap(_pipe, () => {
          return toList([]);
        });
        return filter(_pipe$1, (t) => {
          return t !== task$1;
        });
      })();
      let added_tasks = (() => {
        let _pipe = toList([new Some(tasks), model.in_progress, model.done]);
        let _pipe$1 = map3(
          _pipe,
          (x) => {
            let _pipe$12 = lazy_unwrap(x, () => {
              return toList([""]);
            });
            return toArray(_pipe$12);
          }
        );
        return toArray(_pipe$1);
      })();
      return [
        model.withFields({ to_do: new Some(tasks) }),
        write_localstorage("kanban", added_tasks)
      ];
    } else if (kanban_block$1 === "in_progress") {
      let tasks = (() => {
        let _pipe = model.in_progress;
        let _pipe$1 = lazy_unwrap(_pipe, () => {
          return toList([]);
        });
        return filter(_pipe$1, (t) => {
          return t !== task$1;
        });
      })();
      let added_tasks = (() => {
        let _pipe = toList([model.to_do, new Some(tasks), model.done]);
        let _pipe$1 = map3(
          _pipe,
          (x) => {
            let _pipe$12 = lazy_unwrap(x, () => {
              return toList([""]);
            });
            return toArray(_pipe$12);
          }
        );
        return toArray(_pipe$1);
      })();
      return [
        model.withFields({ in_progress: new Some(tasks) }),
        write_localstorage("in_progress", added_tasks)
      ];
    } else if (kanban_block$1 === "done") {
      let tasks = (() => {
        let _pipe = model.done;
        let _pipe$1 = lazy_unwrap(_pipe, () => {
          return toList([]);
        });
        return filter(_pipe$1, (t) => {
          return t !== task$1;
        });
      })();
      let added_tasks = (() => {
        let _pipe = toList([model.to_do, model.in_progress, new Some(tasks)]);
        let _pipe$1 = map3(
          _pipe,
          (x) => {
            let _pipe$12 = lazy_unwrap(x, () => {
              return toList([""]);
            });
            return toArray(_pipe$12);
          }
        );
        return toArray(_pipe$1);
      })();
      return [
        model.withFields({ done: new Some(tasks) }),
        write_localstorage("done", added_tasks)
      ];
    } else {
      return [model, none()];
    }
  } else {
    let kanban_block$1 = msg[0];
    if (kanban_block$1 === "todo") {
      let $ = model.new_task_input;
      if ($ === "") {
        return [model, none()];
      } else {
        let t = $;
        return [
          model.withFields({
            to_do: new Some(
              prepend(
                t,
                (() => {
                  let _pipe = model.to_do;
                  return lazy_unwrap(
                    _pipe,
                    () => {
                      return toList([]);
                    }
                  );
                })()
              )
            ),
            new_task_input: ""
          }),
          write_localstorage(
            "kanban",
            (() => {
              let _pipe = toList([
                new Some(
                  prepend(
                    t,
                    (() => {
                      let _pipe2 = model.to_do;
                      return lazy_unwrap(
                        _pipe2,
                        () => {
                          return toList([]);
                        }
                      );
                    })()
                  )
                ),
                model.in_progress,
                model.done
              ]);
              let _pipe$1 = map3(
                _pipe,
                (x) => {
                  let _pipe$12 = lazy_unwrap(
                    x,
                    () => {
                      return toList([""]);
                    }
                  );
                  return toArray(_pipe$12);
                }
              );
              return toArray(_pipe$1);
            })()
          )
        ];
      }
    } else if (kanban_block$1 === "in_progress") {
      let $ = model.new_task_input;
      if ($ === "") {
        return [model, none()];
      } else {
        let t = $;
        return [
          model.withFields({
            in_progress: new Some(
              prepend(
                t,
                (() => {
                  let _pipe = model.in_progress;
                  return lazy_unwrap(
                    _pipe,
                    () => {
                      return toList([]);
                    }
                  );
                })()
              )
            ),
            new_task_input: ""
          }),
          write_localstorage(
            "kanban",
            (() => {
              let _pipe = toList([
                model.to_do,
                new Some(
                  prepend(
                    t,
                    (() => {
                      let _pipe2 = model.in_progress;
                      return lazy_unwrap(
                        _pipe2,
                        () => {
                          return toList([]);
                        }
                      );
                    })()
                  )
                ),
                model.done
              ]);
              let _pipe$1 = map3(
                _pipe,
                (x) => {
                  let _pipe$12 = lazy_unwrap(
                    x,
                    () => {
                      return toList([""]);
                    }
                  );
                  return toArray(_pipe$12);
                }
              );
              return toArray(_pipe$1);
            })()
          )
        ];
      }
    } else if (kanban_block$1 === "done") {
      let $ = model.new_task_input;
      if ($ === "") {
        return [model, none()];
      } else {
        let t = $;
        return [
          model.withFields({
            done: new Some(
              prepend(
                t,
                (() => {
                  let _pipe = model.done;
                  return lazy_unwrap(
                    _pipe,
                    () => {
                      return toList([]);
                    }
                  );
                })()
              )
            ),
            new_task_input: ""
          }),
          write_localstorage(
            "kanban",
            (() => {
              let _pipe = toList([
                model.to_do,
                model.in_progress,
                new Some(
                  prepend(
                    t,
                    (() => {
                      let _pipe2 = model.done;
                      return lazy_unwrap(
                        _pipe2,
                        () => {
                          return toList([]);
                        }
                      );
                    })()
                  )
                )
              ]);
              let _pipe$1 = map3(
                _pipe,
                (x) => {
                  let _pipe$12 = lazy_unwrap(
                    x,
                    () => {
                      return toList([""]);
                    }
                  );
                  return toArray(_pipe$12);
                }
              );
              return toArray(_pipe$1);
            })()
          )
        ];
      }
    } else {
      return [model, none()];
    }
  }
}
function block_title() {
  return class$3(
    toList([
      font_size(rem(2)),
      font_weight("bold"),
      margin_("0 0 1.5rem 0"),
      color("#F7F7F7"),
      text_align("center"),
      text_transform("uppercase"),
      letter_spacing("0.1rem")
    ])
  );
}
function container() {
  return class$3(
    toList([
      display("flex"),
      flex_direction("column"),
      align_items("center"),
      margin_("auto"),
      padding(rem(2)),
      width(percent(90)),
      max_width(rem(80)),
      background_color("#001524"),
      border_radius(rem(1)),
      box_shadow("0 8px 16px rgba(0, 0, 0, 0.1)")
    ])
  );
}
function kanban_board_container() {
  return class$3(
    toList([
      overflow_x("auto"),
      white_space("nowrap"),
      padding(rem(1.5)),
      width(percent(100))
    ])
  );
}
function kanban_board() {
  return class$3(
    toList([
      display("flex"),
      flex_direction("row"),
      gap(rem(2.5))
    ])
  );
}
function kanban_block() {
  return class$3(
    toList([
      background_color("#2A3D45"),
      padding(rem(2)),
      width(rem(22)),
      flex_shrink(0),
      border_radius(rem(0.8)),
      box_shadow("0 4px 8px rgba(0,0,0,0.1)"),
      display("flex"),
      flex_direction("column"),
      gap(rem(1.5)),
      hover(toList([box_shadow("0 6px 12px rgba(0,0,0,0.15)")]))
    ])
  );
}
function task() {
  return class$3(
    toList([
      text_align("center"),
      font_size(rem(1.5)),
      background_color("#F7F7F7"),
      border("0.1rem solid #ddd"),
      border_radius(rem(0.4)),
      padding(rem(1)),
      margin_("0.5rem 0"),
      box_shadow("0 1px 3px rgba(0,0,0,0.1)"),
      transition("transform 0.2s ease, box-shadow 0.2s ease"),
      hover(
        toList([
          transform("scale(1.02)"),
          box_shadow("0 6px 12px rgba(0,0,0,0.2)")
        ])
      ),
      overflow("hidden"),
      text_overflow("ellipsis"),
      white_space("normal"),
      line_height("1.8rem")
    ])
  );
}
function add_task_input() {
  return class$3(
    toList([
      background_color("#F7F7F7"),
      border("0.1rem solid #ccc"),
      border_radius(rem(0.4)),
      padding(rem(0.8)),
      margin_("0.5rem 0"),
      box_shadow("0 1px 3px rgba(0,0,0,0.1)"),
      font_size(rem(1.5))
    ])
  );
}
function add_task_button() {
  return class$3(
    toList([
      background_color("#4B8F6A"),
      font_size(rem(1.5)),
      color("#fff"),
      border("none"),
      border_radius(rem(0.4)),
      padding(rem(0.8)),
      margin_("0.5rem 0"),
      text_align("center"),
      font_weight("bold"),
      cursor("pointer"),
      transition("transform 0.2s ease, background-color 0.2s ease"),
      hover(
        toList([
          background_color("#4B8F8C"),
          transform("scale(1.05)")
        ])
      )
    ])
  );
}
function delete_task_button() {
  return class$3(
    toList([
      display("inline-flex"),
      align_items("center"),
      justify_content("center"),
      background_color("transparent"),
      color("#FF5C5C"),
      border("0.1rem solid #FF5C5C"),
      border_radius(rem(0.5)),
      padding_("0.3rem 0.6rem"),
      margin_("0 0 0 0.5rem"),
      cursor("pointer"),
      font_size(rem(1)),
      font_weight("bold"),
      transition(
        "background-color 0.3s ease, color 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease"
      ),
      box_shadow("0 2px 4px rgba(0, 0, 0, 0.1)"),
      hover(
        toList([
          background_color("#FF5C5C"),
          color("#FFFFFF"),
          box_shadow("0 4px 8px rgba(0, 0, 0, 0.2)"),
          transform("scale(1.1)")
        ])
      ),
      focus(
        toList([
          outline("none"),
          box_shadow("0 0 0 0.2rem rgba(255, 92, 92, 0.5)")
        ])
      )
    ])
  );
}
function view(model) {
  let content_updated = (event2) => {
    return try$(
      field("detail", dynamic)(event2),
      (detail) => {
        return try$(
          field("to_do", list(string))(detail),
          (to_do) => {
            return try$(
              field("in_progress", list(string))(
                detail
              ),
              (in_progress) => {
                return try$(
                  field("done", list(string))(detail),
                  (done) => {
                    return new Ok(
                      new UserUpdatedContent(to_do, in_progress, done)
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  };
  return div(
    container(),
    toList([
      id("websocket_element"),
      on2("content-updated", content_updated)
    ]),
    toList([
      div(
        kanban_board_container(),
        toList([]),
        toList([
          div(
            kanban_board(),
            toList([]),
            toList([
              div(
                kanban_block(),
                toList([]),
                toList([
                  div(
                    block_title(),
                    toList([]),
                    toList([text3("To Do")])
                  ),
                  input(
                    add_task_input(),
                    toList([
                      type_("text"),
                      value(model.new_task_input),
                      on_input(
                        (var0) => {
                          return new UpdateNewTask(var0);
                        }
                      )
                    ])
                  ),
                  button(
                    add_task_button(),
                    toList([on_click(new AddTask("todo"))]),
                    toList([text3("Add Task")])
                  ),
                  fragment2(
                    (() => {
                      let _pipe = model.to_do;
                      let _pipe$1 = lazy_unwrap(
                        _pipe,
                        () => {
                          return toList([]);
                        }
                      );
                      return map3(
                        _pipe$1,
                        (task_item) => {
                          return div(
                            task(),
                            toList([]),
                            toList([
                              text3(task_item),
                              button(
                                delete_task_button(),
                                toList([
                                  on_click(
                                    new DeleteTask("todo", task_item)
                                  )
                                ]),
                                toList([text3("X")])
                              )
                            ])
                          );
                        }
                      );
                    })()
                  )
                ])
              ),
              div(
                kanban_block(),
                toList([]),
                toList([
                  div(
                    block_title(),
                    toList([]),
                    toList([text3("In Progress")])
                  ),
                  input(
                    add_task_input(),
                    toList([
                      type_("text"),
                      value(model.new_task_input),
                      on_input(
                        (var0) => {
                          return new UpdateNewTask(var0);
                        }
                      )
                    ])
                  ),
                  button(
                    add_task_button(),
                    toList([on_click(new AddTask("in_progress"))]),
                    toList([text3("Add Task")])
                  ),
                  fragment2(
                    (() => {
                      let _pipe = model.in_progress;
                      let _pipe$1 = lazy_unwrap(
                        _pipe,
                        () => {
                          return toList([]);
                        }
                      );
                      return map3(
                        _pipe$1,
                        (task_item) => {
                          return div(
                            task(),
                            toList([]),
                            toList([
                              text3(task_item),
                              button(
                                delete_task_button(),
                                toList([
                                  on_click(
                                    new DeleteTask("in_progress", task_item)
                                  )
                                ]),
                                toList([text3("X")])
                              )
                            ])
                          );
                        }
                      );
                    })()
                  )
                ])
              ),
              div(
                kanban_block(),
                toList([]),
                toList([
                  div(
                    block_title(),
                    toList([]),
                    toList([text3("Done")])
                  ),
                  input(
                    add_task_input(),
                    toList([
                      type_("text"),
                      value(model.new_task_input),
                      on_input(
                        (var0) => {
                          return new UpdateNewTask(var0);
                        }
                      )
                    ])
                  ),
                  button(
                    add_task_button(),
                    toList([on_click(new AddTask("done"))]),
                    toList([text3("Add Task")])
                  ),
                  fragment2(
                    (() => {
                      let _pipe = model.done;
                      let _pipe$1 = lazy_unwrap(
                        _pipe,
                        () => {
                          return toList([]);
                        }
                      );
                      return map3(
                        _pipe$1,
                        (task_item) => {
                          return div(
                            task(),
                            toList([]),
                            toList([
                              text3(task_item),
                              button(
                                delete_task_button(),
                                toList([
                                  on_click(
                                    new DeleteTask("done", task_item)
                                  )
                                ]),
                                toList([text3("X")])
                              )
                            ])
                          );
                        }
                      );
                    })()
                  )
                ])
              )
            ])
          )
        ])
      )
    ])
  );
}
function main() {
  let $ = cache(new Ephemeral());
  if (!$.isOk()) {
    throw makeError(
      "let_assert",
      "kemotvt",
      19,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $ }
    );
  }
  let cache2 = $[0];
  let _pipe = node();
  let _pipe$1 = compose(_pipe, view, cache2);
  let _pipe$2 = ((_capture) => {
    return application(init2, update, _capture);
  })(_pipe$1);
  return start2(_pipe$2, "#app", void 0);
}

// build/.lustre/entry.mjs
main();
/*! Bundled license information:

partysocket/dist/chunk-4SNNYC7I.mjs:
  (*!
   * Reconnecting WebSocket
   * by Pedro Ladaria <pedro.ladaria@gmail.com>
   * https://github.com/pladaria/reconnecting-websocket
   * License MIT
   *)
*/
