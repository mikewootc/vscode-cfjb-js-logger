// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const insertText = (text) => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('Can\'t insert console.log because no document is open');
        return;
    }

    const selection = editor.selection;

    const range = new vscode.Range(selection.start, selection.end);

    editor.edit((editBuilder) => {
        editBuilder.replace(range, text);
    });
};



// Class = 4,
// Method = 5,
// Property = 6,
// Field = 7,
// Constructor = 8,
// Interface = 10,
// Function = 11,
// Variable = 12,
// Array = 17,
// Object = 18,
// Key = 19,
function findContainingSymbol(symbols, position, parent, indent) {
    const editor = vscode.window.activeTextEditor;

    for (const symbol of symbols) {
		console.log(indent, 'symbol:', symbol);
        if (symbol.range.contains(position)) {
			if (symbol.kind == vscode.SymbolKind.Function) {
				console.log(indent, 'Found function');
				if (symbol.name == '<function>') { // Anonymous function use parent's name
					return parent;
				} else {
					return symbol;
				}
			}
			if (symbol.kind == vscode.SymbolKind.Constructor) {
				console.log(indent, 'Found ctr');
				return symbol;
			}
			if (symbol.kind == vscode.SymbolKind.Method) {
				console.log(indent, 'Found method');
				return symbol;
			}
			if (parent && parent.kind == vscode.SymbolKind.Class && symbol.kind == vscode.SymbolKind.Property) {
				// Some class's function is like: getData = () => {}, which will considered as a 'Property' but not a 'Method' or 'Function'
				console.log(indent, 'Found class property');
				return symbol;
			}
			if (symbol.kind == vscode.SymbolKind.Variable) {
				// Some function is arrow function which assigned to a variable, like: const getData = () => {}. Check the first line contains '=>' and '{' to determine if it's a arrow function
				const line = editor.document.lineAt(symbol.range.c);
				//console.log(indent, 'Found variable. line:', line.text);
				let regArrow = new RegExp(`${symbol}.*=>.*{`);
				if (regArrow.test(line.text)) {
					console.log(indent, 'Found arrow function:', line.text);
					return symbol;
				}

				let regFunc = new RegExp(`${symbol}.*function.*(.*).*{`);
				if (regFunc.test(line.text)) {
					console.log(indent, 'Found function 2 variable:', line.text);
					return symbol;
				}
			}


        }
        const childSymbol = findContainingSymbol(symbol.children, position, symbol, indent + '  ');
        if (childSymbol) {
            return childSymbol;
        }
    }
    return null;
}

async function getCurrentFuncName() {
	let activeEditor = vscode.window.activeTextEditor;
	if (activeEditor !== undefined) {
		let symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', activeEditor.document.uri);
			//console.log('symbols:>>>>', symbols, '<<<<');
			if (symbols) {
				const editor = vscode.window.activeTextEditor;
				if (!editor) {
					return;
				}

				const currentPosition = editor.selection.active;

				// 在符号信息中查找包含光标的函数符号
				const containingSymbol = findContainingSymbol(symbols, currentPosition, null, '');
				if (containingSymbol) {
					const functionName = containingSymbol.name;
					console.log('functionName:>>>>', functionName, '<<<<');
					return functionName;
				} else {
					//vscode.window.showInformationMessage('No function found at current position.');
					throw new Error('NotFound');
				}
			}
	}
}



/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "cfjb-js-logger" is now active!');

	let disposable = vscode.commands.registerCommand('extension.log', async function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

		// 读取配置项
		//const config = vscode.workspace.getConfiguration('cfjb-js-logger');
		const config = vscode.workspace.getConfiguration();
		console.log('config:', config);
		const loggerFunction = config.get('loggerFunction', "logger.debug")
		const insertFunctionNameEnabled = config.get('insertFunctionNameEnabled', true);
		const functionNameSuffix = config.get('functionNameSuffix', '_');
		const useSemiColon = config.get('useSemiColon', true);
		const semiColon = useSemiColon ? ';' : '';
		console.log('loggerFunction:', loggerFunction, 'insertFunctionNameEnabled:', insertFunctionNameEnabled, 'functionNameSuffix:', functionNameSuffix);

		let funcName = '';
		if (insertFunctionNameEnabled) {
			console.log('insertFunctionNameEnabled');
			try {
				funcName = await getCurrentFuncName();
				funcName += functionNameSuffix;
			} catch(error) {
				console.error('getCurrentFuncName error:', error);
				//throw error;
			}
		}

        const selection = editor.selection;
        const text = editor.document.getText(selection);

		if (text) {
            await vscode.commands.executeCommand('editor.action.insertLineAfter')
			const logToInsert = `${loggerFunction}('${funcName}. ${text}:', ${text})${semiColon}`;
			insertText(logToInsert);
		} else {
            insertText(`${loggerFunction}('${funcName}.')${semiColon}`);
		}

		//vscode.window.showInformationMessage('Hello World from cfjb-js-logger!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}



