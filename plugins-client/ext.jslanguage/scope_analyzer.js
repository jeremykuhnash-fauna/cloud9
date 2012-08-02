/**
 * JavaScript scope analysis module and warning reporter.
 * 
 * This handler does a couple of things:
 * 1. It does scope analysis and attaches a scope object to every variable, variable declaration and function declaration
 * 2. It creates markers for undeclared variables
 * 3. It creates markers for unused variables
 * 4. It implements the local variable refactoring
 * 
 * @depend ext/jslanguage/parse
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {
    
var baseLanguageHandler = require('ext/language/base_handler');
var completeUtil = require("ext/codecomplete/complete_util");
var handler = module.exports = Object.create(baseLanguageHandler);
var outline = require("ext/jslanguage/outline");
require("treehugger/traverse"); // add traversal functions to trees

var PROPER = module.exports.PROPER = 80;
var MAYBE_PROPER = module.exports.MAYBE_PROPER = 1;
var NOT_PROPER = module.exports.NOT_PROPER = 0;
var KIND_EVENT = module.exports.KIND_EVENT = "event";
var KIND_PACKAGE = module.exports.KIND_PACKAGE = "package";
var KIND_HIDDEN = module.exports.KIND_HIDDEN = "hidden";
var KIND_DEFAULT = module.exports.KIND_DEFAULT = undefined;
var IN_CALLBACK_DEF = 2;
var IN_CALLBACK_BODY = 1;

// Based on https://github.com/jshint/jshint/blob/master/jshint.js#L331
var GLOBALS = {
    // Literals
    "true"                   : true,
    "false"                  : true,
    "undefined"              : true,
    "null"                   : true,
    "arguments"              : true,
    self                     : true,
    "Infinity"               : true,
    onmessage                : true,
    postMessage              : true,
    importScripts            : true,
    "continue"               : true,
    "return"                 : true,
    "else"                   : true,
    // Browser
    ArrayBuffer              : true,
    Attr                     : true,
    Audio                    : true,
    addEventListener         : true,
    applicationCache         : true,
    blur                     : true,
    clearInterval            : true,
    clearTimeout             : true,
    close                    : true,
    closed                   : true,
    DataView                 : true,
    defaultStatus            : true,
    document                 : true,
    event                    : true,
    FileReader               : true,
    Float32Array             : true,
    Float64Array             : true,
    FormData                 : true,
    getComputedStyle         : true,
    CDATASection             : true,
    HTMLElement              : true,
    HTMLAnchorElement        : true,
    HTMLBaseElement          : true,
    HTMLBlockquoteElement    : true,
    HTMLBodyElement          : true,
    HTMLBRElement            : true,
    HTMLButtonElement        : true,
    HTMLCanvasElement        : true,
    HTMLDirectoryElement     : true,
    HTMLDivElement           : true,
    HTMLDListElement         : true,
    HTMLFieldSetElement      : true,
    HTMLFontElement          : true,
    HTMLFormElement          : true,
    HTMLFrameElement         : true,
    HTMLFrameSetElement      : true,
    HTMLHeadElement          : true,
    HTMLHeadingElement       : true,
    HTMLHRElement            : true,
    HTMLHtmlElement          : true,
    HTMLIFrameElement        : true,
    HTMLImageElement         : true,
    HTMLInputElement         : true,
    HTMLIsIndexElement       : true,
    HTMLLabelElement         : true,
    HTMLLayerElement         : true,
    HTMLLegendElement        : true,
    HTMLLIElement            : true,
    HTMLLinkElement          : true,
    HTMLMapElement           : true,
    HTMLMenuElement          : true,
    HTMLMetaElement          : true,
    HTMLModElement           : true,
    HTMLObjectElement        : true,
    HTMLOListElement         : true,
    HTMLOptGroupElement      : true,
    HTMLOptionElement        : true,
    HTMLParagraphElement     : true,
    HTMLParamElement         : true,
    HTMLPreElement           : true,
    HTMLQuoteElement         : true,
    HTMLScriptElement        : true,
    HTMLSelectElement        : true,
    HTMLStyleElement         : true,
    HTMLTableCaptionElement  : true,
    HTMLTableCellElement     : true,
    HTMLTableColElement      : true,
    HTMLTableElement         : true,
    HTMLTableRowElement      : true,
    HTMLTableSectionElement  : true,
    HTMLTextAreaElement      : true,
    HTMLTitleElement         : true,
    HTMLUListElement         : true,
    HTMLVideoElement         : true,
    Int16Array               : true,
    Int32Array               : true,
    Int8Array                : true,
    Image                    : true,
    localStorage             : true,
    location                 : true,
    navigator                : true,
    open                     : true,
    openDatabase             : true,
    Option                   : true,
    parent                   : true,
    print                    : true,
    removeEventListener      : true,
    resizeBy                 : true,
    resizeTo                 : true,
    screen                   : true,
    scroll                   : true,
    scrollBy                 : true,
    scrollTo                 : true,
    sessionStorage           : true,
    setInterval              : true,
    setTimeout               : true,
    SharedWorker             : true,
    Uint16Array              : true,
    Uint32Array              : true,
    Uint8Array               : true,
    WebSocket                : true,
    window                   : true,
    Worker                   : true,
    XMLHttpRequest           : true,
    XPathEvaluator           : true,
    XPathException           : true,
    XPathExpression          : true,
    XPathNamespace           : true,
    XPathNSResolver          : true,
    XPathResult              : true,
    // Devel
    alert                    : true,
    confirm                  : true,
    console                  : true,
    prompt                   : true,
    // Frameworks
    jQuery                   : true,
    "$"                      : true,
    "$$"                     : true,
    goog                     : true,
    dojo                     : true,
    dojox                    : true,
    dijit                    : true,
    apf                      : true,
    Document                 : true,
    Element                  : true,
    Event                    : true,
    KeyboardEvent            : true,
    MooTools                 : true,
    Window                   : true,
    Ajax                     : true,
    Field                    : true,
    Scriptaculous            : true,
    // require.js
    define                   : true,
    // node.js
    __filename               : true,
    __dirname                : true,
    Buffer                   : true,
    exports                  : true,
    GLOBAL                   : true,
    global                   : true,
    module                   : true,
    process                  : true,
    require                  : true,
    // Standard
    Array                    : true,
    Boolean                  : true,
    Date                     : true,
    decodeURI                : true,
    decodeURIComponent       : true,
    encodeURI                : true,
    encodeURIComponent       : true,
    Error                    : true,
    'eval'                   : true,
    EvalError                : true,
    Function                 : true,
    hasOwnProperty           : true,
    isFinite                 : true,
    isNaN                    : true,
    JSON                     : true,
    Math                     : true,
    Number                   : true,
    Object                   : true,
    parseInt                 : true,
    parseFloat               : true,
    RangeError               : true,
    ReferenceError           : true,
    RegExp                   : true,
    String                   : true,
    SyntaxError              : true,
    TypeError                : true,
    URIError                 : true,
    // non-standard
    escape                   : true,
    unescape                 : true
};

var KEYWORDS = [
    "break",
    "const",
    "continue",
    "delete",
    "do",
    "while",
    "export",
    "for",
    "in",
    "function",
    "if",
    "else",
    "import",
    "instanceof",
    "new",
    "return",
    "switch",
    "this",
    "throw",
    "try",
    "catch",
    "typeof",
    "void",
    "with"
];

handler.handlesLanguage = function(language) {
    return language === 'javascript';
};

var scopeId = 0;

var Variable = module.exports.Variable = function Variable(declaration) {
    this.declarations = [];
    if(declaration)
        this.declarations.push(declaration);
    this.uses = [];
    this.values = [];
};

Variable.prototype.addUse = function(node) {
    this.uses.push(node);
};

Variable.prototype.addDeclaration = function(node) {
    this.declarations.push(node);
};

Variable.prototype.markProperDeclaration = function(confidence) {
    if (!confidence)
        return;
    else if (!this.properDeclarationConfidence)
        this.properDeclarationConfidence = confidence;
    else if (this.properDeclarationConfidence < PROPER)
        this.properDeclarationConfidence += confidence;
};

Variable.prototype.isProperDeclaration = function() {
    return this.properDeclarationConfidence > MAYBE_PROPER;
};

/**
 * Implements Javascript's scoping mechanism using a hashmap with parent
 * pointers.
 */
var Scope = module.exports.Scope = function Scope(parent) {
    this.id = scopeId++;
    this.parent = parent;
    this.vars = {};
};

/**
 * Declare a variable in the current scope
 */
Scope.prototype.declare = function(name, resolveNode, properDeclarationConfidence, kind) {
    var result;
    var vars = this.getVars(kind);
    if (!vars['_'+name]) {
        result = vars['_'+name] = new Variable(resolveNode);
    }
    else if (resolveNode) {
        result = vars['_'+name];
        result.addDeclaration(resolveNode);
    }
    if (result) {
        result.markProperDeclaration(properDeclarationConfidence);
        result.kind = kind;
    }
    return result;
};

Scope.prototype.getVars = function(kind) {
    if (kind)
        return this.vars[kind] = this.vars[kind] || {};
    else
        return this.vars;
};

Scope.prototype.isDeclared = function(name) {
    return !!this.get(name);
};

/**
 * Get possible values of a variable
 * @param name name of variable
 * @return Variable instance
 */
Scope.prototype.get = function(name, kind) {
    var vars = this.getVars(kind);
    if(vars['_'+name])
        return vars['_'+name];
    else if(this.parent)
        return this.parent.get(name, kind);
};

Scope.prototype.getVariableNames = function() {
    return this.getNamesByKind(KIND_DEFAULT);
};

Scope.prototype.getNamesByKind = function(kind) {
    var results = [];
    var vars = this.getVars(kind);
    for (var v in vars) {
        if (vars.hasOwnProperty(v) && v !== KIND_HIDDEN && v !== KIND_PACKAGE)
            results.push(v.slice(1));
    }
    if (this.parent) {
        var namesFromParent = this.parent.getNamesByKind(kind);
        for (var i = 0; i < namesFromParent.length; i++) {
            results.push(namesFromParent[i]);
        }
    }
    return results;
};

var SCOPE_ARRAY = Object.keys(GLOBALS).concat(KEYWORDS);

handler.complete = function(doc, fullAst, data, currentNode, callback) {
    return handler.simpleComplete(doc, fullAst, data, currentNode, callback);
    /*
    var pos = data.pos;
    var line = doc.getLine(pos.row);
    var identifier = completeUtil.retrievePreceedingIdentifier(line, pos.column);

    var matches = completeUtil.findCompletions(identifier, SCOPE_ARRAY);
    callback(matches.map(function(m) {
        return {
          name        : m,
          replaceText : m,
          icon        : null,
          meta        : "EcmaScript",
          priority    : 0
        };
    }));
    */
};

handler.completionRequiresParsing = function() { return true; }

handler.complete = function(doc, fullAst, data, currentNode, callback) {
    var pos = data.pos;
    var line = doc.getLine(pos.row);
    var name = completeUtil.retrievePreceedingIdentifier(line, pos.column);
    var results = handler.simpleComplete(fullAst, currentNode);
    callback(completeUtil.findCompletions(name, results));
};

handler.simpleComplete = function(fullAst, currentNode) {
    simpleScopeAnalyzer([], fullAst);
    
    var scope = [];
    var results = [];
    fullAst.traverseTopDown(
        '_', function() {
            if (this.getAnnotation("simpleScope"))
                scope = this.getAnnotation("simpleScope");
        },
        '_', function() {
            if (this === currentNode)
                results = scope;
        }
    );
    
    return results.map(function(m) {
        return { name : m, replaceText : m, doc: null };
    });
};

// TODO: remove
handler.simpleAnalyze = function(doc, ast, callback) {
    // this.simpleScopeAnalyzer([], ast);
};

function simpleScopeAnalyzer(scope, node) {
    node.setAnnotation("simpleScope", scope);
    node.traverseTopDown(
        'Function(x, _, body)', function(b) {
            scope.push(b.x.value);
            return node;
        }
    );
    node.traverseTopDown(
        'VarDecl(x)', function(b) {
            scope.push(b.x.value);
        },
        'VarDeclInit(x, _)', function(b) {
            scope.push(b.x.value);
        },
        'Function(_, _, body)', function(b) {
            var newScope = scope.concat("this");
            simpleScopeAnalyzer(newScope, b.body);
            return this;
        }
    );
};

handler.analyze = function(doc, ast, callback) {
    var handler = this;
    var markers = [];
    handler.simpleAnalyze(doc, ast, callback);
    
    // Preclare variables (pre-declares, yo!)
    function preDeclareHoisted(scope, node) {
        node.traverseTopDown(
            // var bla;
            'VarDecl(x)', function(b, node) {
                node.setAnnotation("scope", scope);
                scope.declare(b.x.value, b.x, PROPER);
                return node;
            },
            // var bla = 10;
            'VarDeclInit(x, e)', function(b, node) {
                node.setAnnotation("scope", scope);
                scope.declare(b.x.value, b.x, PROPER);
            },
            // function bla(farg) { }
            'Function(x, _, _)', function(b, node) {
                node.setAnnotation("scope", scope);
                if(b.x.value) {
                    scope.declare(b.x.value, b.x, PROPER);
                }
                return node;
            }
        );
    }
    
    function scopeAnalyzer(scope, node, parentLocalVars, inCallback) {
        preDeclareHoisted(scope, node);
        var mustUseVars = parentLocalVars || [];
        node.setAnnotation("scope", scope);
        function analyze(scope, node, inCallback) {
            node.traverseTopDown(
                'VarDecl(x)', function(b) {
                    mustUseVars.push(scope.get(b.x.value));
                    
                }, 
                'VarDeclInit(x, e)', function(b) {
                    // Allow unused function declarations
                    while (b.e.isMatch('Assign(_, _)'))
                        b.e = b.e[1];
                    if (!b.e.isMatch('Function(_, _, _)'))
                        mustUseVars.push(scope.get(b.x.value));
                },
                'Assign(Var(x), e)', function(b, node) {
                    if(!scope.isDeclared(b.x.value)) {
                        markers.push({
                            pos: node[0].getPos(),
                            level: 'warning',
                            type: 'warning',
                            message: "Assigning to undeclared variable."
                        });
                    }
                    else {
                        scope.get(b.x.value).addUse(node[0]);
                    }
                    analyze(scope, b.e, inCallback);
                    return this;
                },
                'ForIn(Var(x), e, stats)', function(b) {
                    if(!scope.isDeclared(b.x.value)) {
                        markers.push({
                            pos: this.getPos(),
                            level: 'warning',
                            type: 'warning',
                            message: "Using undeclared variable as iterator variable."
                        });
                    }
                    analyze(scope, b.e);
                    analyze(scope, b.stats);
                    return this;
                },
                'Var("this")', function(b, node) {
                    if (inCallback === IN_CALLBACK_BODY) {
                        markers.push({
                            pos: this.getPos(),
                            level: 'warning',
                            type: 'warning',
                            message: "Use of 'this' in callback function"
                        });
                    }
                },
                'Var(x)', function(b, node) {
                    node.setAnnotation("scope", scope);
                    if(scope.isDeclared(b.x.value)) {
                        scope.get(b.x.value).addUse(node);
                    } else if(handler.isFeatureEnabled("undeclaredVars") && !GLOBALS[b.x.value]) {
                        markers.push({
                            pos: this.getPos(),
                            level: 'warning',
                            type: 'warning',
                            message: "Undeclared variable."
                        });
                    }
                    return node;
                },
                'Function(x, fargs, body)', function(b, node) {
                    var newScope = new Scope(scope);
                    node.setAnnotation("localScope", newScope);
                    newScope.declare("this");
                    b.fargs.forEach(function(farg) {
                        farg.setAnnotation("scope", newScope);
                        var v = newScope.declare(farg[0].value, farg);
                        if (handler.isFeatureEnabled("unusedFunctionArgs"))
                            mustUseVars.push(v);
                    });
                    scopeAnalyzer(newScope, b.body, null, inCallback === IN_CALLBACK_DEF ? IN_CALLBACK_BODY : 0);
                    return node;
                },
                'Catch(x, body)', function(b, node) {
                    var oldVar = scope.get(b.x.value);
                    // Temporarily override
                    scope.vars["_" + b.x.value] = new Variable(b.x);
                    scopeAnalyzer(scope, b.body, mustUseVars, inCallback);
                    // Put back
                    scope.vars["_" + b.x.value] = oldVar;
                    return node;
                },
                'PropAccess(_, "lenght")', function(b, node) {
                    markers.push({
                        pos: node.getPos(),
                        type: 'warning',
                        level: 'warning',
                        message: "Did you mean 'length'?"
                    });
                },
                'Call(Var("parseInt"), [_])', function() {
                    markers.push({
                        pos: this[0].getPos(),
                        type: 'info',
                        level: 'info',
                        message: "Missing radix argument."
                    });
                },
                'Call(e, args)', function(b) {
                    analyze(scope, b.e, inCallback);
                    analyze(scope, b.args, isCallbackCall(this) ? IN_CALLBACK_DEF : 0);
                    return this;
                },
                'Block(_)', function() {
                    this.setAnnotation("scope", scope);
                },
                'New(Var("require"), _)', function() {
                    markers.push({
                        pos: this[0].getPos(),
                        type: 'warning',
                        level: 'warning',
                        message: "Applying 'new' to require()."
                    });
                }
            );
        }
        analyze(scope, node, inCallback);
        if(!parentLocalVars) {
            for (var i = 0; i < mustUseVars.length; i++) {
                if (mustUseVars[i].uses.length === 0) {
                    var v = mustUseVars[i];
                    v.declarations.forEach(function(decl) {
                        if (decl.value && decl.value === decl.value.toUpperCase())
                            return;
                        markers.push({
                            pos: decl.getPos(),
                            type: 'unused',
                            level: 'info',
                            message: 'Unused variable.'
                        });
                    });
                }
            }
        }
    }
    var rootScope = new Scope();
    scopeAnalyzer(rootScope, ast);
    callback(markers);
};

var isCallbackCall = function(node) {
    var result;
    node.rewrite("Call(PropAccess(_, p), [_])", function(b) {
        if (b.p.value === "forEach" || b.p.value === "map")
            result = true;
    });
    return result || outline.tryExtractEventHandler(node);
};

handler.onCursorMovedNode = function(doc, fullAst, cursorPos, currentNode, callback) {
    if (!currentNode)
        return callback();
    var markers = [];
    var enableRefactorings = [];
    
    function highlightVariable(v) {
        if (!v)
            return;
        v.declarations.forEach(function(decl) {
            if(decl.getPos())
                markers.push({
                    pos: decl.getPos(),
                    type: 'occurrence_main'
                });
        });
        v.uses.forEach(function(node) {
            markers.push({
                pos: node.getPos(),
                type: 'occurrence_other'
            });
        });
    }
    currentNode.rewrite(
        'Var(x)', function(b) {
            var scope = this.getAnnotation("scope");
            if (!scope)
                return;
            var v = scope.get(b.x.value);
            highlightVariable(v);
            // Let's not enable renaming 'this' and only rename declared variables
            if(b.x.value !== "this" && v)
                enableRefactorings.push("renameVariable");
        },
        'VarDeclInit(x, _)', function(b) {
            highlightVariable(this.getAnnotation("scope").get(b.x.value));
            enableRefactorings.push("renameVariable");
        },
        'VarDecl(x)', function(b) {
            highlightVariable(this.getAnnotation("scope").get(b.x.value));
            enableRefactorings.push("renameVariable");
        },
        'FArg(x)', function(b) {
            highlightVariable(this.getAnnotation("scope").get(b.x.value));
            enableRefactorings.push("renameVariable");
        },
        'Function(x, _, _)', function(b) {
            // Only for named functions
            if(!b.x.value || !this.getAnnotation("scope"))
                return;
            highlightVariable(this.getAnnotation("scope").get(b.x.value));
            enableRefactorings.push("renameVariable");
        }
    );
    
    if (!this.isFeatureEnabled("instanceHighlight"))
        return callback({ enableRefactorings: enableRefactorings });

    callback({
        markers: markers,
        enableRefactorings: enableRefactorings
    });
};

handler.getVariablePositions = function(doc, fullAst, cursorPos, currentNode, callback) {
    var v;
    var mainNode;
    currentNode.rewrite(
        'VarDeclInit(x, _)', function(b, node) {
            v = node.getAnnotation("scope").get(b.x.value);
            mainNode = b.x;
        },
        'VarDecl(x)', function(b, node) {
            v = node.getAnnotation("scope").get(b.x.value);
            mainNode = b.x;
        },
        'FArg(x)', function(b, node) {
            v = node.getAnnotation("scope").get(b.x.value);
            mainNode = node;
        },
        'Function(x, _, _)', function(b, node) {
            if(!b.x.value)
                return;
            v = node.getAnnotation("scope").get(b.x.value);
            mainNode = b.x;
        },
        'Var(x)', function(b, node) {
            v = node.getAnnotation("scope").get(b.x.value);
            mainNode = node;
        }
    );
    var pos = mainNode.getPos();
    var others = [];

    var length = pos.ec - pos.sc;

    v.declarations.forEach(function(node) {
         if(node !== currentNode[0]) {
            var pos = node.getPos();
            others.push({column: pos.sc, row: pos.sl});
        }
    });
    
    v.uses.forEach(function(node) {
        if(node !== currentNode) {
            var pos = node.getPos();
            others.push({column: pos.sc, row: pos.sl});
        }
    });
    callback({
        length: length,
        pos: {
            row: pos.sl,
            column: pos.sc
        },
        others: others
    });
};

});