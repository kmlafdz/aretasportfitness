import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";
// Load env from project root
dotenv.config({ path: path.resolve(process.cwd(), "../.env.local") });
// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(serviceAccountKey))
            });
        }
        catch (e) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", e);
        }
    }
}
const server = new Server({
    name: "areta-fitness",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_members",
                description: "List all gym members with their status and expiry dates",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "get_revenue_summary",
                description: "Get a summary of total revenue and transaction volume",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "get_equipment_status",
                description: "Check the status and priority of fitness equipment",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            }
        ],
    };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params;
    const db = admin.firestore();
    try {
        if (name === "get_members") {
            const snapshot = await db.collection("members").orderBy("nama").get();
            const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return {
                content: [{ type: "text", text: JSON.stringify(members, null, 2) }],
            };
        }
        if (name === "get_revenue_summary") {
            const snapshot = await db.collection("transactions").get();
            const transactions = snapshot.docs.map(doc => doc.data());
            const total = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            return {
                content: [{
                        type: "text",
                        text: `Total Revenue: Rp ${total.toLocaleString('id-ID')}\nTotal Transactions: ${transactions.length}`
                    }],
            };
        }
        if (name === "get_equipment_status") {
            const snapshot = await db.collection("assessments").get();
            const equipment = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return {
                content: [{ type: "text", text: JSON.stringify(equipment, null, 2) }],
            };
        }
        throw new Error(`Tool not found: ${name}`);
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Areta Fitness MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
