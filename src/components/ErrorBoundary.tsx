import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h2 className="text-xl font-semibold text-white">Something went wrong on this page</h2>
        <p className="mt-2 text-sm text-ink-300">{this.state.error.message}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button className="btn-ghost" onClick={() => location.reload()}>
            Reload
          </button>
          <a className="btn-primary" href="#/analyze">
            Back to the library
          </a>
        </div>
      </div>
    )
  }
}
