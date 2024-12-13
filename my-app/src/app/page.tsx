'use client'
import {
  useState
} from 'react'
import { Button } from '@/components/ui/button'
import { PieChartIcon } from '@radix-ui/react-icons'
import { Input } from '@/components/ui/input'

export default function Home() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  async function createIndexAndEmbeddings() {
    try {
      const result = await fetch('/api/setup', {
        method: "POST"
      })
      const json = await result.json()
      console.log('result: ', json)
    } catch (err) {
      console.log('err:', err)
    }
  }
  async function sendQuery() {
    if (!query) return
    setResult('')
    setLoading(true)
    try {
      const result = await fetch('/api/read', {
        method: "POST",
        body: JSON.stringify(query)
      })
      const json = await result.json()
      setResult(json.data)
      setLoading(false)
    } catch (err) {
      console.log('err:', err)
      setLoading(false)
    }
  }
  return (
    <main className="flex flex-col justify-center items-center min-h-screen bg-gray-100 p-6">
      <div className="text-center mb-8">
      <h1 className="text-4xl font-extrabold text-gray-800">Semantic Search</h1>
      <p className="text-gray-600 mt-2 text-lg">Empowering AI-driven search at your fingertips</p>
      </div>

      <div className="w-full max-w-lg space-y-4">
      <Input
      className='
      w-full rounded-lg border border-gray-300 bg-white text-gray-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-900' onChange={e => setQuery(e.target.value)} />
      

      <Button
      className='w-full bg-black text-white py-2 rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-500'
      onClick={sendQuery}>Ask AI</Button>
      {
        loading && <div className="flex justify-center my-4">
        <PieChartIcon className="w-8 h-8 text-gray-500 animate-spin" />
      </div>
      }
     <section
  className={`w-full max-w-2xl mt-8 transition-opacity duration-500 ${result ? 'opacity-100' : 'opacity-0'}`}
>
  {result ? (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Search Result</h2>
      <p className="text-gray-700">{result}</p>
    </div>
  ) : (
    !loading && <p className="text-gray-500 text-center">Your search results will appear here.</p>
  )}
</section>

        </div>
      { /* consider removing this button from the UI once the embeddings are created ... */}
      <Button
      className='w-[300px] mt-2'
      variant='outline'
      onClick={createIndexAndEmbeddings}>Create index and embeddings</Button>
   
    </main>
  )
}