// Import necessary modules from LangChain and OpenAI
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { OpenAI } from "@langchain/openai";
import { loadQAStuffChain } from 'langchain/chains'
import { Document } from "langchain/document"
import { timeout } from "../../../config";

// Function to create a Pinecone index if it doesn't exist
export const createPineconeIndex = async (
    client,
    indexName,
    vectorDimension,
) => {
    // Check if the index exists by listing all indexes
    console.log(`Checking "${indexName}"...`);
    const existingIndexes = await client.listIndexes();
    
    // Create the index if it doesn't already exist
    if (!existingIndexes.includes(indexName)) {
        console.log(`Creating "${indexName}"...`);
        
        // Create a new Pinecone index with specified parameters
        await client.createIndex({
            createRequest: {
                name: indexName,
                dimension: vectorDimension,
                metric: 'cosine', // Use cosine similarity for vector comparison
            }
        });
        
        console.log("Creating index... please wait for it to finish initializing.");
        
        // Wait for the index to initialize (using a timeout from config)
        await new Promise((resolve) => setTimeout(resolve, timeout));
    } else {
        console.log(`"${indexName}" already exists`);
    }
}

// Function to update Pinecone index with document embeddings
export const updatePinecone = async (client, indexName, docs) => {
    // Retrieve the specific Pinecone index
    const index = client.index(indexName);
    console.log(`Pinecone index retrieved: ${indexName}`);
    
    // Process each document in the input array
    for (const doc of docs) {
        console.log(`Processing document: ${doc.metadata.source}`);
        const txtPath = doc.metadata.source;
        const text = doc.pageContent;
        
        // Create a text splitter to break document into manageable chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000, // Split text into 1000-character chunks
        });
        console.log('Splitting text into chunks...');
        
        // Split the document text into smaller chunks
        const chunks = await textSplitter.createDocuments([text]);
        console.log(`Text split into ${chunks.length} chunks`);
        
        console.log(`Calling OpenAI's embeddings endpoint with ${chunks.length} text chunks...`);
        
        // Generate embeddings for each text chunk
        const embeddingsArrays = await new OpenAIEmbeddings().embedDocuments(
            chunks.map((chunk) => chunk.pageContent.replace(/\n/g, " "))
        );
        
        console.log(`Creating ${chunks.length} vector array with id, values, and metadata...`);
        
        // Upsert vectors in batches to Pinecone index
        const batchSize = 100;
        let batch = [];
        for (let idx = 0; idx < chunks.length; idx++) { // Fixed the comparison operator
            const chunk = chunks[idx];
            const vector = {
                id: `${txtPath}_${idx}`,
                values: embeddingsArrays[idx],
                metadata: {
                    ...chunk.metadata,
                    loc: JSON.stringify(chunk.metadata.loc),
                    pageContent: chunk.pageContent,
                    txtPath: txtPath,
                },
            };
            
            batch.push(vector);
            
            // Upsert the batch when it reaches batchSize or at the last chunk
            if (batch.length === batchSize || idx === chunks.length - 1) {
                await index.upsert({  
                    upsertRequest: {
                        vectors: batch,
                    },
                });
                
                // Reset the batch
                batch = [];
            }
        }
    }
}

// Function to query Pinecone vector store and generate an answer
export const queryPineconeVectorStoreQueryLLM = async (
    client,
    indexName,
    question
) => {
    console.log('Querying Pinecone vector store');
    
    // Retrieve the specific Pinecone index
    const index = client.index(indexName); // Note: Capitalized 'Index'
    
    // Generate embedding for the query
    const queryEmbedding = await new OpenAIEmbeddings().embedQuery(question)
    
    // Query the Pinecone index to find similar vectors
    let queryResponse = await index.query({
        queryRequest: {
            topK: 10, // Retrieve top 10 most similar vectors
            vector: queryEmbedding,
            includeMetadata: true,
            includeValues: true,
        },
    })
    
    console.log(`Found ${queryResponse.matches.length} matches...`); //  access .length
    console.log(`Asking question: ${question}...`);
    
    // Process the query results if matches are found
    if (queryResponse.matches.length) {
        // Initialize OpenAI language model and QA chain
        const llm = new OpenAI({});
        const chain = loadQAStuffChain(llm);
        
        // Concatenate page content from matched documents
        const concatenatedPageContent = queryResponse.matches
            .map((match: any) => match.metadata.pageContent)
            .join(" ");
        
        // Generate an answer using the QA chain
        const result = await chain.call({
            input_document: [new Document({pageContent: concatenatedPageContent})],
            question: question,
        });
        
        console.log(`Answer: ${result.text}`); //  log the answer.
        return result.text;
    } else {
        console.log(`Since there are no matches, GPT-3 will not be queried`);
        return null;
    }
}