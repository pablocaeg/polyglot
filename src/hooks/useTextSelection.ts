import { useEffect, useCallback, useRef } from 'react'

export function useTextSelection(
  containerRef: React.RefObject<HTMLElement | null>,
  onSelect: (selectedText: string) => void
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSelectionChange = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(() => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) return

      const text = selection.toString().trim()
      if (!text || text.length < 2) return

      // Check if selection is within our container
      if (
        containerRef.current &&
        selection.anchorNode &&
        containerRef.current.contains(selection.anchorNode)
      ) {
        onSelect(text)
      }
    }, 300)
  }, [containerRef, onSelect])

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [handleSelectionChange])
}
