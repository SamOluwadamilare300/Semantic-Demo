import { NextResponse, NextRequest } from "next/server";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { queryPineconeVectorStoreQueryLLM } from "@/app/lib/utils";
import { indexName } from "../../../../config";

export async function POST(req: NextRequest) {
    const body = await req.json()
    
    // Create Pinecone client with API key
    const client = new PineconeClient({
        apiKey: process.env.PINECONE_API_KEY || ''
    });

    // Query the vector store
    const text = await queryPineconeVectorStoreQueryLLM(client, indexName, body)
    
    return NextResponse.json({
        data: text
    })
}