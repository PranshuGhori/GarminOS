export function NoData({ mock }: { mock: boolean }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-line bg-surface p-6 text-center">
      <h2 className="text-base font-semibold">No data yet</h2>
      <p className="mt-2 text-sm text-ink-3">
        {mock ? <>Run <code className="text-ink-2">npm run seed:mock</code> to generate demo data.</> : <>Press <span className="text-ink-2">Sync Now</span> to pull your history from Garmin. The first sync takes a minute or two. If it fails, check that <code className="text-ink-2">GARMIN_PERSONAL_API_KEY</code> is set in <code className="text-ink-2">.env</code> (see <code className="text-ink-2">.env.example</code>).</>}
      </p>
    </div>
  );
}
