import type { Mock } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useSelectedLayoutSegment } from '@/next/navigation'
import PermissionNav from '../index'

vi.mock('@/next/navigation', () => ({
  useSelectedLayoutSegment: vi.fn(),
}))

describe('PermissionNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render correctly when not active', () => {
    (useSelectedLayoutSegment as Mock).mockReturnValue('other')
    render(<PermissionNav />)

    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/permissions')
    expect(link).toHaveClass('text-components-main-nav-nav-button-text')
    expect(link).not.toHaveClass('bg-components-main-nav-nav-button-bg-active')
    expect(screen.getByText('common.menus.permissions')).toBeInTheDocument()
  })

  it('should render correctly when active', () => {
    (useSelectedLayoutSegment as Mock).mockReturnValue('permissions')
    render(<PermissionNav />)

    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveClass('bg-components-main-nav-nav-button-bg-active')
    expect(link).toHaveClass('text-components-main-nav-nav-button-text-active')
    expect(screen.getByText('common.menus.permissions')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    (useSelectedLayoutSegment as Mock).mockReturnValue('other')
    render(<PermissionNav className="custom-test-class" />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('custom-test-class')
  })
})
