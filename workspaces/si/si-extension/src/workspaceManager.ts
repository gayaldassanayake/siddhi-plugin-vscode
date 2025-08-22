import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { createConfigFile } from './utils/utils';

export class WorkspaceManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public activate(): void {
        this.checkWorkspaceForSiddhiFiles();
        const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
            for (const folder of event.added) {
                const folderPath = folder.uri.fsPath;
                
                const config = vscode.workspace.getConfiguration('siddhi');
                const promptEnabled = config.get('promptForConfigFile', true);
                
                if (promptEnabled && this.hasSiddhiFiles(folderPath) && !this.hasConfigFile(folderPath)) {
                    await this.promptForConfigFile(folderPath);
                    break;
                }
            }
        });
        this.context.subscriptions.push(workspaceWatcher);
    }

    private hasSiddhiFiles(folderPath: string): boolean {
        try {
            const files = fs.readdirSync(folderPath, { withFileTypes: true });
            
            for (const file of files) {
                if (file.isFile() && file.name.endsWith('.siddhi')) {
                    return true;
                } else if (file.isDirectory()) {
                    const subDirPath = path.join(folderPath, file.name);
                    if (this.hasSiddhiFiles(subDirPath)) {
                        return true;
                    }
                }
            }
        } catch (error) {
            console.error('Error reading directory:', error);
        }
        
        return false;
    }

    private hasConfigFile(folderPath: string): boolean {
        const configPath = path.join(folderPath, 'si.yaml');
        return fs.existsSync(configPath);
    }

    private async promptForConfigFile(folderPath: string): Promise<void> {
        const response = await vscode.window.showInformationMessage(
            'This workspace contains Siddhi files. Would you like to create an si.yaml configuration file?',
            'Yes',
            'No',
            'Don\'t ask again'
        );
        switch (response) {
            case 'Yes':
                await createConfigFile(folderPath);
                break;
            case 'Don\'t ask again':
                const config = vscode.workspace.getConfiguration('siddhi');
                await config.update('promptForConfigFile', false, vscode.ConfigurationTarget.Workspace);
                break;
        }
    }

    private async checkWorkspaceForSiddhiFiles(): Promise<void> {
        if (!vscode.workspace.workspaceFolders) {
            return;
        }
        for (const folder of vscode.workspace.workspaceFolders) {
            const folderPath = folder.uri.fsPath;
            const config = vscode.workspace.getConfiguration('siddhi');
            const promptEnabled = config.get('promptForConfigFile', true);
            if (!promptEnabled) {
                continue;
            }
            if (this.hasSiddhiFiles(folderPath) && !this.hasConfigFile(folderPath)) {
                await this.promptForConfigFile(folderPath);
                break;
            }
        }
    }
}