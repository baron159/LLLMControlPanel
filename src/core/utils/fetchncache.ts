export async function fetchAndCache(url: string) {
    try {
        const cache = await caches.open("llm-control-panel");
        let cachedResponse = await cache.match(url);
        if (cachedResponse === undefined) {
            console.log(`${url} (network)`);
            const res = await fetch(url);
            try {
                await cache.put(url, res);
            } catch (error) {
                console.error(error);
            }
            return new Response(await res.arrayBuffer());
        }
        console.log(`${url} (cached)`);
        return new Response(await cachedResponse.arrayBuffer());
    } catch (error) {
        console.log(`can't fetch ${url}`);
        throw error;
    }
}