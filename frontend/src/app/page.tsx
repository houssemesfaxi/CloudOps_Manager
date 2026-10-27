export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "non configurée";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">CloudOps Manager</h1>
      <p className="text-gray-600">
        Gestion des projets, serveurs et applications cloud.
      </p>
      <p className="text-sm text-gray-500">
        API : <code>{apiUrl}</code>
      </p>
    </main>
  );
}
