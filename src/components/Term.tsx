'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GLOSSARY, annotate } from '@/lib/glossary';

/** A term with a dotted underline. Hover, focus or tap shows its plain-language definition. */
export function Term({ k, children }: { k: string; children: React.ReactNode }) {
  const entry = GLOSSARY[k];
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const show = useCallback(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const W = 280, left = Math.max(8, Math.min(window.innerWidth - W - 8, r.left + r.width / 2 - W / 2));
    const above = r.bottom + 150 > window.innerHeight;
    setPos({ left, top: above ? r.top - 8 : r.bottom + 8, above });
  }, []);
  const hide = useCallback(() => setPos(null), []);
  useEffect(() => {
    if (!pos) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && hide();
    window.addEventListener('scroll', hide, true);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('scroll', hide, true); window.removeEventListener('keydown', esc); };
  }, [pos, hide]);
  if (!entry) return <>{children}</>;
  return (
    <>
      <span ref={ref} tabIndex={0} role="button" aria-describedby={pos ? id : undefined}
        onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
        onClick={(e) => { e.stopPropagation(); pos ? hide() : show(); }}
        className="cursor-help underline decoration-ink-3/60 decoration-dotted underline-offset-[3px] outline-none hover:decoration-ink-2 focus-visible:decoration-s1">
        {children}
      </span>
      {pos && createPortal(
        <span id={id} role="tooltip" style={{ left: pos.left, top: pos.top, width: 280, transform: pos.above ? 'translateY(-100%)' : undefined }}
          className="pointer-events-none fixed z-[60] block rounded-lg border border-line bg-raised p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-2 shadow-2xl">
          <span className="mb-1 block font-semibold text-ink">{entry.term}</span>
          {entry.def}
        </span>, document.body)}
    </>
  );
}

/** Renders text with every recognised glossary term turned into a <Term>. */
export function Explain({ children }: { children: string | null | undefined }) {
  if (!children) return null;
  return <>{annotate(children).map((p, i) => (typeof p === 'string' ? p : <Term key={i} k={p.key}>{p.text}</Term>))}</>;
}
