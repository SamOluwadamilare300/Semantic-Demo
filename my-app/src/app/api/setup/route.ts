import { NextResponse } from "next/server";
import {Pinecone as PineconeClient} from "@pinecone-database/pinecone"
import { TextLoader } from "langchain/document_loaders/fs/text";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { createPineconeIndex, updatePinecone } from "@/app/lib/utils";
import { indexName } from "../../../../config";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";

export async function POST() {
    const loader = new DirectoryLoader('./documents',{   
 ".txt": (path) => new TextLoader(path),
 ".md": (path) => new TextLoader(path),
 ".pdf": (path) => new PDFLoader(path)
}) 

const docs = await loader.load()
const vectorDimension = 1536

   // Create Pinecone client with API key
   const client = new PineconeClient({
    apiKey: process.env.PINECONE_API_KEY || ''
});

try {
    await createPineconeIndex(client, indexName, vectorDimension)
    await updatePinecone(client, indexName, docs)
}catch (err){
    console.log('error:', err)
}
return NextResponse.json({
    data: 'successfully created index and loaded data into pinecone.'
})
}