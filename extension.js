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

function findContainingSymbol(symbols, position) {
    for (const symbol of symbols) {
        if (symbol.range.contains(position)) {
            return symbol;
        }
        const childSymbol = findContainingSymbol(symbol.children, position);
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
				const containingSymbol = findContainingSymbol(symbols, currentPosition);
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
		const loggerFunction = config.get('loggerFunction', "logger.debug2")
		const insertFunctionNameEnabled = config.get('insertFunctionNameEnabled', true);
		const functionNameSuffix = config.get('functionNameSuffix', '');
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
			const logToInsert = `${loggerFunction}('${funcName}. ${text}:', ${text});`;
			insertText(logToInsert);
		} else {
            insertText(`${loggerFunction}('${funcName}.');`);
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
