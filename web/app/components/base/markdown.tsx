import ReactMarkdown from 'react-markdown'
import ReactEcharts from 'echarts-for-react'
import 'katex/dist/katex.min.css'
import RemarkMath from 'remark-math'
import RemarkBreaks from 'remark-breaks'
import RehypeKatex from 'rehype-katex'
import RemarkGfm from 'remark-gfm'
import RehypeRaw from 'rehype-raw'
import SyntaxHighlighter from 'react-syntax-highlighter'
import {
  atelierHeathDark,
  atelierHeathLight,
} from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { Component, memo, useMemo, useRef, useState } from 'react'
import { flow } from 'lodash-es'
import ActionButton from '@/app/components/base/action-button'
import CopyIcon from '@/app/components/base/copy-icon'
import SVGBtn from '@/app/components/base/svg'
import Flowchart from '@/app/components/base/mermaid'
import ImageGallery from '@/app/components/base/image-gallery'
import { useChatContext } from '@/app/components/base/chat/chat/context'
import VideoGallery from '@/app/components/base/video-gallery'
import AudioGallery from '@/app/components/base/audio-gallery'
import MarkdownButton from '@/app/components/base/markdown-blocks/button'
import MarkdownForm from '@/app/components/base/markdown-blocks/form'
import ThinkBlock from '@/app/components/base/markdown-blocks/think-block'
import { Theme } from '@/types/app'
import useTheme from '@/hooks/use-theme'
import cn from '@/utils/classnames'
import SVGRenderer from './svg-gallery'

// Available language react-syntax-highlighter/AVAILABLE_LANGUAGES_HLJS.MD at master · react-syntax-highlighter/react-synt
const capitalizationLanguageNameMap: Record<string, string> = {
  sql: 'SQL',
  javascript: 'JavaScript',
  java: 'Java',
  typescript: 'TypeScript',
  vbscript: 'VBScript',
  css: 'CSS',
  html: 'HTML',
  xml: 'XML',
  php: 'PHP',
  python: 'Python',
  yaml: 'Yaml',
  mermaid: 'Mermaid',
  markdown: 'MarkDown',
  makefile: 'MakeFile',
  echarts: 'ECharts',
  shell: 'Shell',
  powershell: 'PowerShell',
  json: 'JSON',
  latex: 'Latex',
  svg: 'SVG',
}
const getCorrectCapitalizationLanguageName = (language: string) => {
  if (!language)
    return 'Plain'

  if (language in capitalizationLanguageNameMap)
    return capitalizationLanguageNameMap[language]

  return language.charAt(0).toUpperCase() + language.substring(1)
}

const preprocessLaTeX = (content: string) => {
  if (typeof content !== 'string')
    return content

  const codeBlockRegex = /```[\s\S]*?```/g
  const codeBlocks = content.match(codeBlockRegex) || []
  let processedContent = content.replace(codeBlockRegex, 'CODE_BLOCK_PLACEHOLDER')

  processedContent = flow([
    (str: string) => str.replace(/\\\[(.*?)\\\]/g, (_, equation) => `$$${equation}$$`),
    (str: string) => str.replace(/\\\[(.*?)\\\]/gs, (_, equation) => `$$${equation}$$`),
    (str: string) => str.replace(/\\\((.*?)\\\)/g, (_, equation) => `$$${equation}$$`),
    (str: string) => str.replace(/(^|[^\\])\$(.+?)\$/g, (_, prefix, equation) => `${prefix}$${equation}$`),
  ])(processedContent)

  codeBlocks.forEach((block) => {
    processedContent = processedContent.replace('CODE_BLOCK_PLACEHOLDER', block)
  })

  return processedContent
}

const preprocessThinkTag = (content: string) => {
  return flow([
    (str: string) => str.replace('<think>\n', '<details data-think=true>\n'),
    (str: string) => str.replace('\n</think>', '\n[ENDTHINKFLAG]</details>'),
  ])(content)
}

export function PreCode(props: { children: any }) {
  const ref = useRef<HTMLPreElement>(null)

  return (
    <pre ref={ref}>
      <span
        className="copy-code-button"
      ></span>
      {props.children}
    </pre>
  )
}

// **Add code block
// Avoid error #185 (Maximum update depth exceeded.
// This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate.
// React limits the number of nested updates to prevent infinite loops.)
// Reference A: https://reactjs.org/docs/error-decoder.html?invariant=185
// Reference B1: https://react.dev/reference/react/memo
// Reference B2: https://react.dev/reference/react/useMemo
// ****
// The original error that occurred in the streaming response during the conversation:
// Error: Minified React error 185;
// visit https://reactjs.org/docs/error-decoder.html?invariant=185 for the full message
// or use the non-minified dev environment for full errors and additional helpful warnings.

const CodeBlock: any = memo(({ inline, className, children, ...props }: any) => {
  const { theme } = useTheme()
  const [isSVG, setIsSVG] = useState(true)
  const match = /language-(\w+)/.exec(className || '')
  const language = match?.[1]
  const languageShowName = getCorrectCapitalizationLanguageName(language || '')
  const chartData = useMemo(() => {
    if (language === 'echarts') {
      try {
        return JSON.parse(String(children).replace(/\n$/, ''))
      }
      catch (error) { }
    }
    return JSON.parse('{"title":{"text":"ECharts error - Wrong JSON format."}}')
  }, [language, children])

  const renderCodeContent = useMemo(() => {
    const content = String(children).replace(/\n$/, '')
    if (language === 'mermaid' && isSVG) {
      return <Flowchart PrimitiveCode={content} />
    }
    else if (language === 'echarts') {
      return (
        <div style={{ minHeight: '350px', minWidth: '100%', overflowX: 'scroll' }}>
          <ErrorBoundary>
            <ReactEcharts option={chartData} style={{ minWidth: '700px' }} />
          </ErrorBoundary>
        </div>
      )
    }
    else if (language === 'svg' && isSVG) {
      return (
        <ErrorBoundary>
          <SVGRenderer content={content} />
        </ErrorBoundary>
      )
    }
    else {
      return (
        <SyntaxHighlighter
          {...props}
          style={theme === Theme.light ? atelierHeathLight : atelierHeathDark}
          customStyle={{
            paddingLeft: 12,
            borderBottomLeftRadius: '10px',
            borderBottomRightRadius: '10px',
            backgroundColor: 'var(--color-components-input-bg-normal)',
          }}
          language={match?.[1]}
          showLineNumbers
          PreTag="div"
        >
          {content}
        </SyntaxHighlighter>
      )
    }
  }, [language, match, props, children, chartData, isSVG])

  if (inline || !match)
    return <code {...props} className={className}>{children}</code>

  return (
    <div className='relative'>
      <div className='flex h-8 items-center justify-between rounded-t-[10px] border-b border-divider-subtle bg-components-input-bg-normal p-1 pl-3'>
        <div className='system-xs-semibold-uppercase text-text-secondary'>{languageShowName}</div>
        <div className='flex items-center gap-1'>
          {(['mermaid', 'svg']).includes(language!) && <SVGBtn isSVG={isSVG} setIsSVG={setIsSVG} />}
          <ActionButton>
            <CopyIcon content={String(children).replace(/\n$/, '')} />
          </ActionButton>
        </div>
      </div>
      {renderCodeContent}
    </div>
  )
})
CodeBlock.displayName = 'CodeBlock'

const VideoBlock: any = memo(({ node }: any) => {
  const srcs = node.children.filter((child: any) => 'properties' in child).map((child: any) => (child as any).properties.src)
  if (srcs.length === 0)
    return null
  return <VideoGallery key={srcs.join()} srcs={srcs} />
})
VideoBlock.displayName = 'VideoBlock'

const AudioBlock: any = memo(({ node }: any) => {
  const srcs = node.children.filter((child: any) => 'properties' in child).map((child: any) => (child as any).properties.src)
  if (srcs.length === 0)
    return null
  return <AudioGallery key={srcs.join()} srcs={srcs} />
})
AudioBlock.displayName = 'AudioBlock'

const ScriptBlock = memo(({ node }: any) => {
  const scriptContent = node.children[0]?.value || ''
  return `<script>${scriptContent}</script>`
})
ScriptBlock.displayName = 'ScriptBlock'

const TableBlock = ({ node, ...props }: any) => {
  const tableRef = useRef<HTMLTableElement>(null)
  const table = node

  /**
   * 从表格单元格节点中提取文本内容
   * 处理嵌套的文本节点和内联元素
   */
  const extractCellText = (cell: any): string => {
    if (!cell.children || cell.children.length === 0) {
      return ''
    }
    
    // 递归提取所有文本内容
    const getText = (node: any): string => {
      if (node.type === 'text') {
        return node.value || ''
      }
      if (node.children) {
        return node.children.map(getText).join('')
      }
      return ''
    }
    
    return getText(cell).trim()
  }

  /**
   * 转义 CSV 格式的特殊字符
   * - 如果单元格包含逗号、双引号或换行符，需要用双引号包裹
   * - 双引号本身需要转义为两个双引号
   */
  const escapeCsvCell = (text: string): string => {
    // 如果包含特殊字符，需要用引号包裹
    if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
      // 将双引号转义为两个双引号
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  /**
   * 转义 HTML 特殊字符
   */
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  /**
   * 从表格行节点中提取所有单元格的文本
   */
  const extractRowData = (row: any): string[] => {
    if (!row.children) {
      return []
    }
    return row.children
      .filter((cell: any) => cell.type === 'element' && (cell.tagName === 'th' || cell.tagName === 'td'))
      .map(extractCellText)
  }

  /**
   * 生成 CSV 格式的字符串
   */
  const generateCsv = (): string => {
    const csvRows: string[] = []

    // 查找 thead 和 tbody
    const thead = table.children?.find((child: any) => child.tagName === 'thead')
    const tbody = table.children?.find((child: any) => child.tagName === 'tbody')

    // 处理表头
    if (thead && thead.children) {
      thead.children.forEach((row: any) => {
        if (row.tagName === 'tr') {
          const headers = extractRowData(row)
          if (headers.length > 0) {
            csvRows.push(headers.map(escapeCsvCell).join(','))
          }
        }
      })
    }

    // 处理表体
    if (tbody && tbody.children) {
      tbody.children.forEach((row: any) => {
        if (row.tagName === 'tr') {
          const cells = extractRowData(row)
          if (cells.length > 0) {
            csvRows.push(cells.map(escapeCsvCell).join(','))
          }
        }
      })
    }

    return csvRows.join('\n')
  }

  /**
   * 生成 HTML 格式的表格字符串（用于 WPS、Word 等应用）
   */
  const generateHtmlTable = (): string => {
    const thead = table.children?.find((child: any) => child.tagName === 'thead')
    const tbody = table.children?.find((child: any) => child.tagName === 'tbody')

    let html = '<table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; border: 1px solid #ddd;">'

    // 处理表头
    if (thead && thead.children) {
      html += '<thead>'
      thead.children.forEach((row: any) => {
        if (row.tagName === 'tr') {
          html += '<tr>'
          const headers = extractRowData(row)
          headers.forEach((header) => {
            html += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; font-weight: bold;">${escapeHtml(header)}</th>`
          })
          html += '</tr>'
        }
      })
      html += '</thead>'
    }

    // 处理表体
    if (tbody && tbody.children) {
      html += '<tbody>'
      tbody.children.forEach((row: any) => {
        if (row.tagName === 'tr') {
          html += '<tr>'
          const cells = extractRowData(row)
          cells.forEach((cell) => {
            html += `<td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(cell)}</td>`
          })
          html += '</tr>'
        }
      })
      html += '</tbody>'
    }

    html += '</table>'
    return html
  }

  /**
   * 自定义复制功能：同时复制 CSV 和 HTML 格式
   */
  const handleCopy = async () => {
    try {
      const csv = generateCsv()
      const html = generateHtmlTable()

      // 检查浏览器是否支持 ClipboardItem API
      if (navigator.clipboard && window.ClipboardItem) {
        // 创建包含多种格式的 ClipboardItem
        const clipboardItem = new ClipboardItem({
          'text/plain': new Blob([csv], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        })

        await navigator.clipboard.write([clipboardItem])
        console.log('表格已复制（多格式）')
      } else {
        // 降级方案：只复制纯文本
        await navigator.clipboard.writeText(csv)
        console.log('表格已复制（仅文本格式）')
      }
    } catch (error) {
      console.error('复制失败:', error)
      // 如果上述方法都失败，尝试传统的复制方法
      fallbackCopy(generateCsv())
    }
  }

  /**
   * 降级复制方案（用于不支持 Clipboard API 的浏览器）
   */
  const fallbackCopy = (text: string) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      console.log('表格已复制（降级方案）')
    } catch (error) {
      console.error('降级复制失败:', error)
    }
    document.body.removeChild(textArea)
  }

  return (
    <div className="relative">
      <table ref={tableRef} {...props} />
      <div className="absolute -top-7 right-0">
        <ActionButton onClick={handleCopy}>
          <CopyIcon />
        </ActionButton>
      </div>
    </div>
  )
}

const Paragraph = (paragraph: any) => {
  const { node }: any = paragraph
  const children_node = node.children
  if (children_node && children_node[0] && 'tagName' in children_node[0] && children_node[0].tagName === 'img') {
    return (
      <>
        <ImageGallery srcs={[children_node[0].properties.src]} />
        {
          Array.isArray(paragraph.children) ? <p>{paragraph.children.slice(1)}</p> : null
        }
      </>
    )
  }
  return <p>{paragraph.children}</p>
}

const Img = ({ src }: any) => {
  return (<ImageGallery srcs={[src]} />)
}

const Link = ({ node, ...props }: any) => {
  if (node.properties?.href && node.properties.href?.toString().startsWith('abbr')) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { onSend } = useChatContext()
    const hidden_text = decodeURIComponent(node.properties.href.toString().split('abbr:')[1])

    return <abbr className="cursor-pointer underline !decoration-primary-700 decoration-dashed" onClick={() => onSend?.(hidden_text)} title={node.children[0]?.value}>{node.children[0]?.value}</abbr>
  }
  else {
    return <a {...props} target="_blank" className="cursor-pointer underline !decoration-primary-700 decoration-dashed">{node.children[0] ? node.children[0]?.value : 'Download'}</a>
  }
}

export function Markdown(props: { content: string; className?: string; customDisallowedElements?: string[] }) {
  const latexContent = flow([
    preprocessThinkTag,
    preprocessLaTeX,
  ])(props.content)

  return (
    <div className={cn('markdown-body', '!text-text-primary', props.className)}>
      <ReactMarkdown
        remarkPlugins={[
          RemarkGfm,
          [RemarkMath, { singleDollarTextMath: false }],
          RemarkBreaks,
        ]}
        rehypePlugins={[
          RehypeKatex,
          RehypeRaw as any,
          // The Rehype plug-in is used to remove the ref attribute of an element
          () => {
            return (tree) => {
              const iterate = (node: any) => {
                if (node.type === 'element' && node.properties?.ref)
                  delete node.properties.ref

                if (node.type === 'element' && !/^[a-z][a-z0-9]*$/i.test(node.tagName)) {
                  node.type = 'text'
                  node.value = `<${node.tagName}`
                }

                if (node.children)
                  node.children.forEach(iterate)
              }
              tree.children.forEach(iterate)
            }
          },
        ]}
        disallowedElements={['iframe', 'head', 'html', 'meta', 'link', 'style', 'body', ...(props.customDisallowedElements || [])]}
        components={{
          code: CodeBlock,
          img: Img,
          video: VideoBlock,
          audio: AudioBlock,
          a: Link,
          p: Paragraph,
          button: MarkdownButton,
          form: MarkdownForm,
          script: ScriptBlock as any,
          details: ThinkBlock,
          table: TableBlock,
        }}
      >
        {/* Markdown detect has problem. */}
        {latexContent}
      </ReactMarkdown>
    </div>
  )
}

// **Add an ECharts runtime error handler
// Avoid error #7832 (Crash when ECharts accesses undefined objects)
// This can happen when a component attempts to access an undefined object that references an unregistered map, causing the program to crash.

export default class ErrorBoundary extends Component {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  componentDidCatch(error: any, errorInfo: any) {
    this.setState({ hasError: true })
    console.error(error, errorInfo)
  }

  render() {
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-expect-error
    if (this.state.hasError)
      return <div>Oops! An error occurred. This could be due to an ECharts runtime error or invalid SVG content. <br />(see the browser console for more information)</div>
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-expect-error
    return this.props.children
  }
}