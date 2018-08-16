

test('pass', () => {
    console.log('!!!! pass')
});

test('fail', () => {
    throw new Error("nuts")
});