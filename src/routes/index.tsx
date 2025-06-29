import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div>
      <h3 className="text-3xl font-bold underline">Welcome Home!</h3>
    </div>
  )
}