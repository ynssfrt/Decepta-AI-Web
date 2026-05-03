import asyncio
from curl_cffi.requests import AsyncSession

async def test_trendyol_api():
    # Example product ID: 154946658
    url = "https://public.trendyol.com/discovery-web-socialgw-service/reviews/154946658/bilgilendirme?merchantId=968"
    # Actually Trendyol review API is usually:
    # https://public.trendyol.com/discovery-web-socialgw-service/api/review/154946658
    
    api_url = "https://public.trendyol.com/discovery-web-socialgw-service/api/review/154946658?merchantId=104683&storefrontId=1&culture=tr-TR&storeFrontId=1&storefrontId=1"
    
    async with AsyncSession() as session:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Origin": "https://www.trendyol.com",
            "Referer": "https://www.trendyol.com/"
        }
        resp = await session.get(api_url, impersonate="chrome120", headers=headers)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text[:500]}")

if __name__ == "__main__":
    asyncio.run(test_trendyol_api())
