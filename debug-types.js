const src1 = require('./test/types-sample.json');
const src2 = require('./test/self-types.json');

const KindString = {
    Class: 'Class',
    Constructor: 'Constructor',
    Enumeration: 'Enumeration',
    EnumerationMember: 'Enumeration member',
    ExternalModule: 'External module',
    Function: 'Function',
    Interface: 'Interface',
    Method: 'Method',
    Module: 'Module',
    ObjectLiteral: 'Object literal',
    Property: 'Property',
    TypeAlias: 'Type alias',
    Variable: 'Variable',
};

const kindCount = new Map(); // kindString -> count
const propKindCounts = new Map(); // propName -> (kindString -> count)

function explore(node) {

    const r = {};
    r.id = node.id;
    r.name = node.name;
    const kindString = node.kindString;
    // r.kind = node.kind;
    r.kindString = kindString;

    if (kindString) {

        kindCount.set(kindString, (kindCount.get(kindString) || 0) + 1);

        for (const propName in node) {
            if (!propKindCounts.has(propName)) {
                propKindCounts.set(propName, new Map());
            }
            const kindCountsForThisProp = propKindCounts.get(propName);
            kindCountsForThisProp.set(kindString, (kindCountsForThisProp.get(kindString) || 0) + 1);
        }
    }

    let c = [];

    for (const child of node.children || []) {
        c.push(explore(child));
    }

    // We don't retain all the children in the simplified tree, but we still want to explore them so we trim after
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
  
function dumpTotals() {
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
}

const src1Details = explore(src1);
const src2Details = explore(src2);

dumpTotals();

