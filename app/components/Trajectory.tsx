'use client';

export default function Trajectory() {
  return (
    <section
      id="trajectory"
      className="min-h-screen flex flex-col items-center justify-center py-20"
    >
      <h2 className="font-serif font-bold text-white text-4xl mb-12">{/* Trajectory */}</h2>

      <div className="w-full px-10" onContextMenu={(e) => e.preventDefault()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/trajectory/2026-01-20_Timeline.jpg"
          alt="My Trajectory — Timeline"
          className="w-full h-auto img-protected"
        />
      </div>
    </section>
  );
}
