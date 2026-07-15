export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex min-h-screen flex-col p-8">
      <h1 className="text-lg font-semibold text-text">Channel #{id}</h1>
      <p className="text-text-secondary">Channel view to be implemented.</p>
    </main>
  );
}
