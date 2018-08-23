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

    if (Array.isArray(node)) {
        for (const el of node) {
            if(typeof el === 'object') {
                explore(el);
            }
        }
        return;
    }

    if (typeof node !== 'object') {
        return;
    }

    const kindString = node.kindString;

    // Collect kinds, map kinds to props
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

    // Recurse
    for (const prop of Object.values(node)) {
        if (typeof prop === 'object') {
            explore(prop);
        }
    }
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

explore(src1);
explore(src2);

dumpTotals();

