import { useEffect, useRef, useState } from 'react'

/** width of a container, tracked with ResizeObserver */
export function useWidth(initial = 600) {
  const ref = useRef(null)
  const [w, setW] = useState(initial)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.floor(e.contentRect.width))))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

/** index of the scrolly step currently crossing the middle of the viewport */
export function useActiveStep(count) {
  const refs = useRef([])
  const [active, setActive] = useState(0)
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number(e.target.dataset.step))
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    refs.current.slice(0, count).forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [count])
  return [refs, active]
}
