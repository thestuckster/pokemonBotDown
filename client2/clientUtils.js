
// Returns a set of the differences between the keys of two objects.
function keyDifferences(a, b) {
    const aKeys = new Set(Object.keys(a));
    const bKeys = new Set(Object.keys(b));
    const difference = new Set([...aKeys].filter(x => !bKeys.has(x)));

    return difference;
}

module.exports.keyDifferences = keyDifferences;
