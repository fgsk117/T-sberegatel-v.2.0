const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { productCategory, blacklistedCategories } = await req.json();

    if (!productCategory || !blacklistedCategories) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const matches = blacklistedCategories.map((blacklisted: string) => {
      const similarity = calculateSimilarity(
        productCategory.toLowerCase(),
        blacklisted.toLowerCase()
      );

      let reason = '';
      if (similarity >= 80) {
        reason = 'Категории практически идентичны';
      } else if (similarity >= 60) {
        reason = 'Категории очень похожи';
      } else if (similarity >= 40) {
        reason = 'Категории частично совпадают';
      } else if (similarity >= 20) {
        reason = 'Категории могут быть связаны';
      } else {
        reason = 'Категории не связаны';
      }

      return {
        blacklisted_category: blacklisted,
        similarity_score: similarity,
        reason,
      };
    });

    const sortedMatches = matches
      .filter((m: any) => m.similarity_score > 0)
      .sort((a: any, b: any) => b.similarity_score - a.similarity_score);

    return new Response(
      JSON.stringify({
        productCategory,
        matches: sortedMatches,
        highestMatch: sortedMatches[0] || null,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error matching categories:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 100;

  if (str1.includes(str2) || str2.includes(str1)) {
    return 85;
  }

  const synonyms: { [key: string]: string[] } = {
    техника: ['электроника', 'гаджеты', 'устройства', 'приборы'],
    игры: ['видеоигры', 'геймы', 'консоли', 'игровые'],
    одежда: ['шмотки', 'вещи', 'гардероб', 'fashion'],
    еда: ['продукты', 'питание', 'фастфуд', 'food'],
    транспорт: ['машина', 'авто', 'автомобиль', 'мото'],
    развлечения: ['досуг', 'отдых', 'хобби', 'fun'],
  };

  for (const [key, values] of Object.entries(synonyms)) {
    const group = [key, ...values];
    if (group.includes(str1) && group.includes(str2)) {
      return 75;
    }
  }

  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  const commonWords = words1.filter((w) => words2.includes(w));

  if (commonWords.length > 0) {
    const ratio = commonWords.length / Math.max(words1.length, words2.length);
    return Math.round(ratio * 60);
  }

  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  const similarity = ((maxLen - distance) / maxLen) * 100;

  return Math.round(similarity);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
