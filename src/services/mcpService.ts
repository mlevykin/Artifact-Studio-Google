import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { MCPConfig } from "../types";

export class MCPService {
  private static clients: Map<string, Client> = new Map();
  private static transports: Map<string, SSEClientTransport> = new Map();

  static async connect(config: MCPConfig): Promise<{ tools: any[] }> {
    try {
      // Close existing connection if any
      await this.disconnect(config.id);

      // Refresh token if needed
      if (config.authType === 'oauth2' && config.oauthConfig?.refreshToken && config.oauthConfig.expiresAt) {
        if (Date.now() > config.oauthConfig.expiresAt - 60000) {
          try {
            // In a real app, you'd call exchangeCodeForTokens with refresh_token
            // For now, we'll just log it
            console.log('Token expired, should refresh');
          } catch (e) {
            console.error('Failed to refresh token', e);
          }
        }
      }

      const url = new URL(config.url);
      
      // Add API key if needed
      if (config.authType === 'apiKey' && config.apiKey) {
        url.searchParams.set('apiKey', config.apiKey);
      }

      // Add OAuth token if needed
      if (config.authType === 'oauth2' && config.oauthConfig?.accessToken) {
        url.searchParams.set('token', config.oauthConfig.accessToken);
      }

      // Use proxy to avoid CORS, except for local connections
      const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      let finalUrl: URL;
      
      if (isLocal) {
        finalUrl = url;
      } else {
        const protocol = url.protocol.replace(':', '');
        finalUrl = new URL(`${window.location.origin}/proxy/${protocol}/${url.host}${url.pathname}${url.search}`);
      }
      
      const transport = new SSEClientTransport(finalUrl);
      const client = new Client(
        {
          name: "Artifact Studio Client",
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );

      await client.connect(transport);
      
      this.clients.set(config.id, client);
      this.transports.set(config.id, transport);

      const toolsResponse = await client.listTools();
      return { tools: toolsResponse.tools || [] };
    } catch (error) {
      console.error(`Failed to connect to MCP server ${config.name}:`, error);
      throw error;
    }
  }

  static async callTool(config: MCPConfig, toolName: string, args: any): Promise<any> {
    let client = this.clients.get(config.id);
    
    if (!client) {
      const { tools } = await this.connect(config);
      client = this.clients.get(config.id);
      if (!client) throw new Error(`Failed to connect to MCP server ${config.name}`);
    }

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });
      return result;
    } catch (error) {
      console.error(`Error calling tool ${toolName} on ${config.name}:`, error);
      throw error;
    }
  }

  static async disconnect(id: string) {
    const transport = this.transports.get(id);
    if (transport) {
      try {
        await transport.close();
      } catch (e) {
        console.warn(`Error closing transport for ${id}:`, e);
      }
      this.transports.delete(id);
    }
    this.clients.delete(id);
  }

  static async disconnectAll() {
    for (const id of this.clients.keys()) {
      await this.disconnect(id);
    }
  }

  static async exchangeCodeForTokens(config: MCPConfig, code: string, redirectUri: string): Promise<any> {
    if (!config.oauthConfig?.tokenUrl) throw new Error('Token URL not configured');

    const url = new URL(config.oauthConfig.tokenUrl);
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    let finalUrl: string;

    if (isLocal) {
      finalUrl = url.toString();
    } else {
      const protocol = url.protocol.replace(':', '');
      finalUrl = `${window.location.origin}/proxy/${protocol}/${url.host}${url.pathname}${url.search}`;
    }

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.oauthConfig.clientId,
        client_secret: config.oauthConfig.clientSecret,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to exchange code' }));
      throw new Error(error.error || 'Failed to exchange code');
    }

    return await response.json();
  }
}
