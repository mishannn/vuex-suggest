/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';

function parseMapping(funcName: string, documentText: string): Array<string> {
  const regex: RegExp = new RegExp(`(${funcName})\\(\\S*?\\[(\\S+?)\\]\\)`, 'g');

  let m: RegExpExecArray | null = null;
  let result: Array<string> = [];

  do {
    m = regex.exec(documentText);
    if (m) {
      const items: Array<string> = m[2].replace(/('|^,|,$)/g, '').split(',');
      result = [...result, ...items];
    }
  } while (m);

  return result;
}

interface ParsedMappings {
  state: Array<string>,
  getters: Array<string>,
  actions: Array<string>,
  mutations: Array<string>,
}

function parseDocument(documentText: string): ParsedMappings {
  return {
    state: parseMapping('mapState', documentText),
    getters: parseMapping('mapGetters', documentText),
    actions: parseMapping('mapActions', documentText),
    mutations: parseMapping('mapMutations', documentText)
  };
}

function buildSuggestions(documentText: string): Array<vscode.CompletionItem> {
  const spaceRegex = /\s+/g;
  const newDocumentText = documentText.replace(spaceRegex, '').replace('"', '\'');

  const parsedMappings: ParsedMappings = parseDocument(newDocumentText);

  const stateAndGetters = [
    ...parsedMappings.state,
    ...parsedMappings.getters
  ];

  const actionsAndMutations = [
    ...parsedMappings.actions,
    ...parsedMappings.mutations
  ];

  return [
    ...stateAndGetters.map(item => {
      return new vscode.CompletionItem(item, vscode.CompletionItemKind.Property)
    }),
    ...actionsAndMutations.map(item => {
      return new vscode.CompletionItem(item, vscode.CompletionItemKind.Method)
    }),
  ];
}

export function activate(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerCompletionItemProvider(
    { scheme: 'file', language: 'vue' },
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        let linePrefix = document.lineAt(position).text.substr(0, position.character);
        if (!linePrefix.endsWith('this.')) {
          return undefined;
        }

        return buildSuggestions(document.getText());
      }
    },
    '.'
  );

  context.subscriptions.push(provider);
}