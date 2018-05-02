var assert = require('assert');
var babel = require('babel-core');
var colors = require('colors');
var clear = require('clear');
var diff = require('diff');
var fs = require('fs');
var path = require('path');

require('babel-register');

var pluginPath = require.resolve('../src');

function runTests() {
	var testsPath = __dirname + '/fixtures/';

	fs.readdirSync(testsPath).map(function(item) {
		return {
			path: path.join(testsPath, item),
			name: item,
		};
	}).filter(function(item) {
		return fs.statSync(item.path).isDirectory();
	}).forEach(runTest);
}

function runTest(dir) {
	var output = babel.transformFileSync(dir.path + '/actual.js', {
		plugins: [pluginPath]
	});

	var expected = fs.readFileSync(dir.path + '/expected.js', 'utf-8');

	function normalizeLines(str) {
		return str.replace(/\r\n/g, '\n').trimRight();
	}

	var normalizedOutput = normalizeLines(output.code);
	var normalizedExpected = normalizeLines(expected);

	if (normalizedOutput === normalizedExpected) {
		process.stdout.write(colors.bgWhite.black(dir.name) + ' ' + colors.green('OK'));
	} else {
		process.stdout.write(colors.bgWhite.black(dir.name) + ' ' + colors.red('Different'));
		process.stdout.write('\n\n');

		diff.diffLines(normalizedOutput, normalizedExpected)
		.forEach(function (part) {
			var value = part.value.replace(/\t/g, '»   ').replace(/^\n$/, '↵\n');
			if (part.added) {
				value = colors.green(value);
			} else if (part.removed) {
				value = colors.red(value);
			}


			process.stdout.write(value);
		});
	}

	process.stdout.write('\n\n\n');
}

if (process.argv.indexOf('--watch') >= 0) {
	require('watch').watchTree(__dirname + '/..', function () {
		delete require.cache[pluginPath];
		clear();
		console.log('Press Ctrl+C to stop watching...');
		console.log('================================');
		try {
			runTests();
		} catch (e) {
			console.error(colors.magenta(e.stack));
		}
	});
} else {
	runTests();
}
