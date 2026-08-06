import type { WhitelistEntry } from '@/models/app-permission'
import type { Mock } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  useGrantWhitelistUsers,
  useRevokeWhitelistUser,
  useUpdateWhitelistExpiry,
  useWhitelist,
} from '@/service/use-permissions'
import WhitelistModal from '../whitelist-modal'

type WhitelistResponse = { data: WhitelistEntry[] }

let mockEntries: WhitelistEntry[] = []
let mockIsPending = false
const mockGrant = vi.fn()
const mockRevoke = vi.fn()
const mockUpdateExpiry = vi.fn()
const mockToastError = vi.fn()
const mockToastWarning = vi.fn()
const originalConfirm = window.confirm

vi.mock('@/service/use-permissions', () => ({
  useWhitelist: vi.fn(),
  useGrantWhitelistUsers: vi.fn(),
  useRevokeWhitelistUser: vi.fn(),
  useUpdateWhitelistExpiry: vi.fn(),
}))

vi.mock('@langgenius/dify-ui/toast', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: vi.fn(),
    warning: (...args: unknown[]) => mockToastWarning(...args),
  },
}))

const APP_ID = 'app-1'

describe('WhitelistModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEntries = []
    mockIsPending = false
    mockGrant.mockResolvedValue({ data: [], skipped: [] })
    mockRevoke.mockResolvedValue({ result: 'success' })
    mockUpdateExpiry.mockResolvedValue(undefined)
    window.confirm = vi.fn(() => true)
    ;(useWhitelist as Mock).mockImplementation(() => ({
      data: { data: mockEntries } as WhitelistResponse,
      isPending: mockIsPending,
    }))
    ;(useGrantWhitelistUsers as Mock).mockImplementation(() => ({
      mutateAsync: mockGrant,
    }))
    ;(useRevokeWhitelistUser as Mock).mockImplementation(() => ({
      mutateAsync: mockRevoke,
    }))
    ;(useUpdateWhitelistExpiry as Mock).mockImplementation(() => ({
      mutateAsync: mockUpdateExpiry,
    }))
  })

  afterAll(() => {
    window.confirm = originalConfirm
  })

  it('should render the modal title with the app name', () => {
    render(<WhitelistModal appId={APP_ID} appName="My App" onClose={vi.fn()} />)
    expect(screen.getByText(/common\.permissions\.whitelistModal\.title/)).toBeInTheDocument()
  })

  it('should render empty state when there are no entries', () => {
    render(<WhitelistModal appId={APP_ID} appName="My App" onClose={vi.fn()} />)
    expect(screen.getByText('common.permissions.whitelistModal.empty')).toBeInTheDocument()
  })

  it('should render filter empty state when filter has no matches', () => {
    mockEntries = [{ id: 'p1', app_id: APP_ID, user_id: 'a', expires_at: null, created_at: '', updated_at: '' }]
    render(<WhitelistModal appId={APP_ID} appName="My App" onClose={vi.fn()} />)
    const filterInput = screen.getByPlaceholderText('common.permissions.whitelistModal.sessionIdFilterPlaceholder')
    fireEvent.change(filterInput, { target: { value: 'zzz' } })
    expect(screen.getByText('common.permissions.whitelistModal.filterEmpty')).toBeInTheDocument()
  })

  it('should grant whitelist users and skip the empty user_ids case', async () => {
    render(<WhitelistModal appId={APP_ID} appName="My App" onClose={vi.fn()} />)

    const userIdInput = screen.getByPlaceholderText('common.permissions.whitelistModal.userIdPlaceholder')
    fireEvent.change(userIdInput, { target: { value: '   ' } })
    fireEvent.click(screen.getByText('common.permissions.whitelistModal.save'))

    await waitFor(() => {
      expect(mockGrant).not.toHaveBeenCalled()
      expect(mockToastError).toHaveBeenCalledWith('common.permissions.feedback.grantFailed')
    })
  })

  it('should split comma-separated user ids and call grant', async () => {
    render(<WhitelistModal appId={APP_ID} appName="My App" onClose={vi.fn()} />)

    const userIdInput = screen.getByPlaceholderText('common.permissions.whitelistModal.userIdPlaceholder')
    fireEvent.change(userIdInput, { target: { value: 'a, b,c' } })
    fireEvent.click(screen.getByText('common.permissions.whitelistModal.save'))

    await waitFor(() => {
      expect(mockGrant).toHaveBeenCalledWith({ userIds: ['a', 'b', 'c'], expiresAt: null })
    })
  })

  it('should warn when grant returns skipped entries', async () => {
    mockGrant.mockResolvedValueOnce({ data: [], skipped: ['dup-1', 'dup-2'] })
    render(<WhitelistModal appId={APP_ID} appName="My App" onClose={vi.fn()} />)

    const userIdInput = screen.getByPlaceholderText('common.permissions.whitelistModal.userIdPlaceholder')
    fireEvent.change(userIdInput, { target: { value: 'dup-1' } })
    fireEvent.click(screen.getByText('common.permissions.whitelistModal.save'))

    await waitFor(() => {
      expect(mockToastWarning).toHaveBeenCalledWith(expect.stringContaining('common.permissions.feedback.grantPartial'))
    })
  })

  it('should revoke a whitelist entry after confirm', async () => {
    mockEntries = [{ id: 'p1', app_id: APP_ID, user_id: 'a', expires_at: null, created_at: '', updated_at: '' }]
    render(<WhitelistModal appId={APP_ID} appName="My App" onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('common.permissions.whitelistModal.delete'))
    await waitFor(() => {
      expect(mockRevoke).toHaveBeenCalledWith('p1')
    })
  })

  it('should not revoke if confirm is cancelled', () => {
    window.confirm = vi.fn(() => false)
    mockEntries = [{ id: 'p1', app_id: APP_ID, user_id: 'a', expires_at: null, created_at: '', updated_at: '' }]
    render(<WhitelistModal appId={APP_ID} appName="My App" onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('common.permissions.whitelistModal.delete'))
    expect(mockRevoke).not.toHaveBeenCalled()
  })

  it('should update expiry when the per-row date input changes', async () => {
    mockEntries = [{ id: 'p1', app_id: APP_ID, user_id: 'a', expires_at: '2026-12-31', created_at: '', updated_at: '' }]
    render(<WhitelistModal appId={APP_ID} appName="My App" onClose={vi.fn()} />)

    // The first date input is the add-form expiry; the second is the per-row editor.
    const dateInputs = document.querySelectorAll('input[type="date"]')
    const entryExpiry = dateInputs[1] as HTMLInputElement
    expect(entryExpiry).toBeDefined()
    fireEvent.change(entryExpiry, { target: { value: '2027-06-01' } })

    await waitFor(() => {
      expect(mockUpdateExpiry).toHaveBeenCalledWith({ permId: 'p1', expiresAt: '2027-06-01' })
    })
  })

  it('should call onClose when dialog requests close', () => {
    const onClose = vi.fn()
    render(<WhitelistModal appId={APP_ID} appName="My App" onClose={onClose} />)
    const cancelButton = screen.getByText('common.permissions.whitelistModal.cancel')
    fireEvent.click(cancelButton)
    expect(onClose).toHaveBeenCalled()
  })
})
