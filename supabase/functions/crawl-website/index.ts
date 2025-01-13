import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { parse } from "https://esm.sh/node-html-parser@6.1.11";

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

interface PageContent {
  title: string;
  description: string;
  content: string;
  url: string;
}

interface CrawlResult {
  mainPage: PageContent;
  subPages: PageContent[];
}

async function crawlPage(url: string, baseUrl: string): Promise<PageContent> {
  console.log('Crawling URL:', url);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch webpage: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  console.log('Fetched HTML length:', html.length);
  
  const root = parse(html);

  // Remove unwanted elements
  [
    'script',
    'style',
    'nav',
    'footer',
    'header',
    'aside',
    'iframe',
    'noscript',
    '.cookie-banner',
    '.popup',
    '.modal',
    '.overlay',
    '#wpadminbar',
    '.wp-block-spacer',
    '.elementor-hidden-desktop',
    '.elementor-hidden-mobile',
    '.elementor-widget-spacer'
  ].forEach(selector => {
    root.querySelectorAll(selector).forEach(el => el.remove());
  });

  // 텍스트 블록을 저장할 배열
  const blocks: Array<{text: string; score: number}> = [];

  // 텍스트 블록 추출 함수
  function extractTextBlock(element: any, score: number) {
    const text = element.text.trim();
    if (text.length > 15) {
      blocks.push({ text, score });
    }
  }

  let mainContent = '';

  // 특정 웹사이트의 컨텐츠 영역을 찾기 위한 선택자들
  const contentSelectors = [
    '.elementor-widget-container',
    '.elementor-text-editor',
    '.elementor-widget-text-editor',
    '.elementor-widget-heading',
    '.elementor-heading-title',
    '.wp-block-group__inner-container',
    '.entry-content',
    '.post-content',
    '.page-content',
    '.site-content',
    'article',
    'main',
    '[role="main"]',
    '.main-content',
    '.content',
    '#content'
  ];

  // 컨텐츠 영역에서 텍스트 추출
  contentSelectors.forEach(selector => {
    const elements = root.querySelectorAll(selector);
    elements.forEach(element => {
      extractTextBlock(element, 1); // 컨텐츠 영역에서 찾은 텍스트는 높은 점수 부여
    });
  });

  // 텍스트 밀도를 계산하는 함수
  function calculateTextDensity(element: any): number {
    const text = element.text.trim();
    const html = element.innerHTML;
    if (!text || !html) return 0;
    
    // 텍스트 길이 대비 HTML 태그 비율 계산
    return text.length / html.length;
  }

  // 텍스트 블록의 품질 점수를 계산하는 함수
  function calculateTextQuality(text: string): number {
    // 한글 문장 끝 문자 포함 (마침표, 물음표, 느낌표, 한글 문장 부호)
    const sentenceEnds = (text.match(/[.!?。？！]/g) || []).length;
    
    // 쉼표와 한글 쉼표 포함
    const commas = (text.match(/[,，、]/g) || []).length;
    
    // 한글 비율 계산
    const koreanChars = (text.match(/[가-힣]/g) || []).length;
    const koreanRatio = koreanChars / text.length;
    
    // 단어 수 계산 (한글, 영어 모두 고려)
    const words = text.split(/[\s,.!?。？！，、]+/).filter(Boolean).length;
    
    if (words === 0) return 0;
    
    // 평균 단어 길이 계산
    const avgWordLength = text.length / words;
    
    // 문장 구조 점수
    const structureScore = (sentenceEnds + commas) / words;
    
    // 단어 길이 점수 (너무 짧거나 긴 것 피하기)
    const wordLengthScore = Math.min(Math.max(avgWordLength, 2), 10) / 10;
    
    // 한글 가중치 추가
    const koreanScore = koreanRatio * 2;
    
    // 최종 점수 계산 (한글 비중 높임)
    return (structureScore * 0.3 + wordLengthScore * 0.2 + koreanScore * 0.5);
  }


  try {
    // 전체 문서에서 텍스트 블록 추출
    function crawlElement(element: any, depth = 0) {
      // 무시할 태그 목록
      const ignoreTags = ['script', 'style', 'nav', 'footer', 'header', 'aside'];
      if (!element.tagName || ignoreTags.includes(element.tagName.toLowerCase())) return;

      const text = element.text.trim();
      if (text.length > 15) {  // 최소 길이 조건 완화
        const density = calculateTextDensity(element);
        const quality = calculateTextQuality(text);
        const depthScore = Math.max(0, 1 - depth * 0.1);  // 깊이가 깊을수록 점수 감소
        
        // 한글이 포함된 경우 가중치 부여
        const hasKorean = /[가-힣]/.test(text);
        const koreanBonus = hasKorean ? 1.5 : 1;
        
        const score = density * quality * depthScore * koreanBonus;
        extractTextBlock(element, score);
      }

      // 자식 요소들 재귀적으로 처리
      if (element.childNodes) {
        element.childNodes.forEach(child => {
          if (child && typeof child === 'object' && 'tagName' in child) {
            crawlElement(child, depth + 1);
          }
        });
      }
    }

    // 전체 문서 크롤링
    crawlElement(root);

    // 점수순으로 정렬하고 상위 블록들만 선택
    blocks.sort((a, b) => b.score - a.score);
    
    // 상위 10개 블록 선택 (또는 전체 블록의 30% 중 더 큰 값)
    const numBlocksToKeep = Math.max(10, Math.ceil(blocks.length * 0.3));
    mainContent = blocks
      .slice(0, numBlocksToKeep)
      .map(block => block.text)
      .join('\n\n');

    console.log('Extracted content blocks:', blocks.length);
    console.log('Keeping blocks:', numBlocksToKeep);
  } catch (error) {
    console.error('Error extracting content:', error);
    mainContent = '';
  }

  // Get meta information
  const title = root.querySelector('title')?.text || 
                root.querySelector('meta[property="og:title"]')?.getAttribute('content') || 
                root.querySelector('h1')?.text || '';

  const descriptions = [
    root.querySelector('meta[name="description"]')?.getAttribute('content'),
    root.querySelector('meta[property="og:description"]')?.getAttribute('content'),
    root.querySelector('meta[name="twitter:description"]')?.getAttribute('content')
  ].filter(Boolean);

  return {
    url,
    title,
    description: descriptions.join(' ') || '',
    content: mainContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim()
  };
}

function getInternalLinks(root: any, baseUrl: string): string[] {
  const links = new Set<string>();
  const baseUrlObj = new URL(baseUrl);

  root.querySelectorAll('a').forEach(element => {
    const href = element.getAttribute('href');
    if (!href) return;

    try {
      // Handle relative URLs
      const absoluteUrl = new URL(href, baseUrl);
      
      // Only include URLs from the same domain
      if (absoluteUrl.hostname === baseUrlObj.hostname && 
          !absoluteUrl.pathname.includes('/api/') && // Skip API endpoints
          !absoluteUrl.pathname.endsWith('.jpg') && // Skip image files
          !absoluteUrl.pathname.endsWith('.png') &&
          !absoluteUrl.pathname.endsWith('.pdf') &&
          !absoluteUrl.pathname.includes('/auth/') && // Skip auth pages
          !absoluteUrl.pathname.includes('/login') &&
          !absoluteUrl.pathname.includes('/signup')) {
        links.add(absoluteUrl.toString());
      }
    } catch {
      // Skip invalid URLs
    }
  });

  return Array.from(links);
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Received request:', req.url);
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Crawl main page first
    const mainPageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const mainPageHtml = await mainPageResponse.text();
    console.log('Fetched main page HTML length:', mainPageHtml.length);
    const root = parse(mainPageHtml);
    
    // Get internal links from main page
    const internalLinks = getInternalLinks(root, url);
    console.log('Found internal links:', internalLinks.length);
    
    // Limit to first 5 subpages to avoid too many requests
    const subpagesToCrawl = internalLinks.slice(0, 5);
    console.log('Will crawl subpages:', subpagesToCrawl);
    
    // Crawl main page and subpages concurrently
    const [mainPage, ...subPages] = await Promise.all([
      crawlPage(url, url),
      ...subpagesToCrawl.map(link => crawlPage(link, url))
    ]);

    const result: CrawlResult = {
      mainPage,
      subPages
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
