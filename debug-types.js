const src = require('./test/types-sample.json');

const KindString = {
    Class              : 'Class',
    Constructor        : 'Constructor',
    Enumeration        : 'Enumeration',
    EnumerationMember  : 'Enumeration member',
    ExternalModule     : 'External module',
    Function           : 'Function',
    Interface          : 'Interface',
    Method             : 'Method',
    Module             : 'Module',
    ObjectLiteral      : 'Object literal',
    Property           : 'Property',
    TypeAlias          : 'Type alias',
    Variable           : 'Variable',
};

const kindCount = new Map(); // kindString -> count
const propKindCounts = new Map(); // propName -> (kindString -> count)

function simplify(node) {



    const r = {};
    r.id = node.id;
    r.name = node.name;
    const kindString = node.kindString;
    // r.kind = node.kind;
    r.kindString = kindString;

    if (kindString) {
     
        kindCount.set(kindString, (kindCount.get(kindString)||0) + 1);
       
        for (const propName in node) {
            if (!propKindCounts.has(propName)) {
                propKindCounts.set(propName, new Map());
            }
            const kindCountsForThisProp = propKindCounts.get(propName);
            kindCountsForThisProp.set(kindString, (kindCountsForThisProp.get(kindString) || 0)+1);
        }
    }

    let c = [];

    for (const child of node.children || []) {
        c.push(simplify(child));
    }

    if (kindString === KindString.Class ||
        kindString === KindString.Interface ||
        kindString === KindString.ObjectLiteral ||
        kindString === KindString.Enumeration) {
        c = [];
    }

    if (c.length) {
        r.children = c;
        return r;
    }

    return `${r.kindString} ${r.name}`;
}

console.log();
console.log(`Dumping type info for ${src.name}`);
console.log('=============================================================');

const cleaned = simplify(src);

// console.log(JSON.stringify(cleaned, null, 4));

console.log();
console.log('All Kinds:');
for (const kind of kindCount.keys()) {
    console.log(` * ${kind} - ${kindCount.get(kind)}`);
}

console.log();
console.log('All Props:');
const propGrid = [];
for (const propName of propKindCounts.keys()) {

    const propRow = { propName };
    const matchingKindCounts = propKindCounts.get(propName);

    for (const kind of kindCount.keys()) {
        if (matchingKindCounts.has(kind)) {
            propRow[kind] = matchingKindCounts.get(kind) === kindCount.get(kind) ? 'ALL' : 'some';
        }
    }
    
    propGrid.push(propRow);
}
console.table(propGrid);
