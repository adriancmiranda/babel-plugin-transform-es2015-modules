'use strict';

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('better-log/install');
var template = require('babel-template');

var buildRequire = template('\n \trequire($0);\n');

var buildRequireDefault = template('\n \trequire($0).default;\n');

var buildExportsAssignment = template('\n \tmodule.exports = $0;\n');

var buildNamedExportsAssignment = template('\n\texports.$0 = $1;\n');

var buildExportAll = template('\n\tfor(var $1 in $0) {\n\t\tif ($1 !== "default") {\n\t\t\texports[$1] = $0[$1];\n\t\t}\n\t}\n');

module.exports = function (_ref) {
	var t = _ref.types;

	return {
		inherits: require("babel-plugin-transform-strict-mode"),
		visitor: {
			Program: {
				exit: function exit(path, file) {
					var sources = [],
					    anonymousSources = [],
					    scope = path.scope,
					    hasDefaultExport = false,
					    hasNamedExports = false,
					    lastExportPath = null;

					// rename these commonjs variables if they're declared in the file
					scope.rename("module");
					scope.rename("exports");
					scope.rename("require");

					var body = path.get("body");

					function addSource(path) {
						var importedID = path.scope.generateUidIdentifier(path.node.source.value);

						sources.push(t.variableDeclaration("var", [t.variableDeclarator(importedID, buildRequire(path.node.source).expression)]));

						return importedID;
					}

					function changeSourcePath(source, substr, newSubStr) {
						source.extra.rawValue = source.extra.rawValue.replace(substr, newSubStr);
						source.extra.raw = source.extra.raw.replace(substr, newSubStr);
						source.value = source.value.replace(substr, newSubStr);
					}

					var _iteratorNormalCompletion = true;
					var _didIteratorError = false;
					var _iteratorError = undefined;

					try {
						for (var _iterator = (0, _getIterator3.default)(body), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
							var _path = _step.value;

							if (_path.isExportDefaultDeclaration()) {
								hasDefaultExport = true;
								lastExportPath = _path;
								var declaration = _path.get("declaration");
								if (declaration.type == 'FunctionDeclaration') {
									if (declaration.node.id) {
										_path.replaceWithMultiple([buildExportsAssignment(declaration.node.id), declaration.node]);
									} else {
										_path.replaceWith(buildExportsAssignment(t.toExpression(declaration.node)));
									}
								} else {
									_path.replaceWith(buildExportsAssignment(declaration.node));
								}
								continue;
							}

							if (_path.isImportDeclaration()) {
								var _ret = function () {
									var match = file.opts.match;
									var replaceBy = file.opts.replaceBy;
									if ((typeof match === 'string' || match instanceof String || match instanceof RegExp) === false) {
										match = '';
									}
									if ((typeof replaceBy === 'string' || replaceBy instanceof String || typeof replaceBy === 'function') === false) {
										replaceBy = '';
									}
									if (file.opts.changeSources) {
										changeSourcePath(_path.node.source, match, replaceBy);
									}
									var specifiers = _path.node.specifiers;
									var is2015Compatible = _path.node.source.value.match(/babel-runtime[\\\/]/);
									if (specifiers.length == 0) {
										anonymousSources.push(buildRequire(_path.node.source));
									} else if (specifiers.length == 1 && specifiers[0].type == 'ImportDefaultSpecifier') {
										var _template = is2015Compatible ? buildRequireDefault : buildRequire;
										sources.push(t.variableDeclaration("var", [t.variableDeclarator(t.identifier(specifiers[0].local.name), _template(_path.node.source).expression)]));
									} else {
										var importedID = addSource(_path);

										specifiers.forEach(function (_ref2) {
											var imported = _ref2.imported,
											    local = _ref2.local;

											if (!imported || !is2015Compatible && imported.name === 'default') {
												sources.push(t.variableDeclaration("var", [t.variableDeclarator(t.identifier(local.name), t.identifier(importedID.name))]));
											} else {
												sources.push(t.variableDeclaration("var", [t.variableDeclarator(t.identifier(local.name), t.identifier(importedID.name + '.' + imported.name))]));
											}
										});
									}

									_path.remove();
									return 'continue';
								}();

								if (_ret === 'continue') continue;
							}

							if (_path.isExportNamedDeclaration()) {
								lastExportPath = _path;
								var _declaration = _path.get("declaration");

								// if we are exporting a class/function/variable
								if (_declaration.node) {
									hasNamedExports = true;
									if (_declaration.isFunctionDeclaration()) {
										var id = _declaration.node.id;
										_path.replaceWithMultiple([_declaration.node, buildNamedExportsAssignment(id, id)]);
									} else if (_declaration.isClassDeclaration()) {
										var _id = _declaration.node.id;
										_path.replaceWithMultiple([_declaration.node, buildNamedExportsAssignment(_id, _id)]);
									} else if (_declaration.isVariableDeclaration()) {
										var declarators = _declaration.get("declarations");
										var _iteratorNormalCompletion2 = true;
										var _didIteratorError2 = false;
										var _iteratorError2 = undefined;

										try {
											for (var _iterator2 = (0, _getIterator3.default)(declarators), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
												var decl = _step2.value;

												var _id2 = decl.get("id");

												var init = decl.get("init");
												if (!init.node) {
													init.replaceWith(t.identifier("undefined"));
												}

												if (_id2.isIdentifier()) {
													init.replaceWith(buildNamedExportsAssignment(_id2.node, init.node).expression);
												}
											}
										} catch (err) {
											_didIteratorError2 = true;
											_iteratorError2 = err;
										} finally {
											try {
												if (!_iteratorNormalCompletion2 && _iterator2.return) {
													_iterator2.return();
												}
											} finally {
												if (_didIteratorError2) {
													throw _iteratorError2;
												}
											}
										}

										_path.replaceWith(_declaration.node);
									}
									continue;
								}

								// if we are exporting already instantiated variables
								var specifiers = _path.get("specifiers");
								if (specifiers.length) {
									var nodes = [];
									var source = _path.node.source;
									var importedID = void 0;
									if (source) {
										// export a from 'b';
										// 'b' is the source
										importedID = addSource(_path);
									}

									var _iteratorNormalCompletion3 = true;
									var _didIteratorError3 = false;
									var _iteratorError3 = undefined;

									try {
										for (var _iterator3 = (0, _getIterator3.default)(specifiers), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
											var specifier = _step3.value;

											if (specifier.isExportSpecifier()) {
												var local = specifier.node.local;

												// if exporting from we need to modify the local lookup
												if (importedID) {
													if (local.name === 'default') {
														local = importedID;
													} else {
														local = t.memberExpression(importedID, local);
													}
												}

												// if exporting to default, its module.exports
												if (specifier.node.exported.name === 'default') {
													hasDefaultExport = true;
													nodes.push(buildExportsAssignment(local));
												} else {
													hasNamedExports = true;
													nodes.push(buildNamedExportsAssignment(specifier.node.exported, local));
												}
											}
										}
									} catch (err) {
										_didIteratorError3 = true;
										_iteratorError3 = err;
									} finally {
										try {
											if (!_iteratorNormalCompletion3 && _iterator3.return) {
												_iterator3.return();
											}
										} finally {
											if (_didIteratorError3) {
												throw _iteratorError3;
											}
										}
									}

									_path.replaceWithMultiple(nodes);
								}
								continue;
							}

							if (_path.isExportAllDeclaration()) {
								// export * from 'a';
								var _importedID = addSource(_path);
								var keyName = _path.scope.generateUidIdentifier(_importedID.name + "_key");

								_path.replaceWithMultiple(buildExportAll(_importedID, keyName));
							}
						}
					} catch (err) {
						_didIteratorError = true;
						_iteratorError = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion && _iterator.return) {
								_iterator.return();
							}
						} finally {
							if (_didIteratorError) {
								throw _iteratorError;
							}
						}
					}

					if (hasNamedExports && hasDefaultExport) {
						throw lastExportPath.buildCodeFrameError('The "babel-plugin-transform-es2015-modules" plugin does not support both a export default and a export named in the same file. This is because the module.exports would override any export');
					}

					path.unshiftContainer("body", sources.concat(anonymousSources));
				}
			}
		}
	};
};