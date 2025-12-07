import { test, expect } from '@playwright/test';
import { StorePage, ActualProduct } from '../pages/StorePage'; 

// --- Data Structures for API responses ---

// Defines the structure of a product item from the /list API endpoint
interface ProductListItem { 
    id: string; 
    name: string; 
}
// Defines the structure of the price details from the /price/{id} API endpoint
interface ProductPriceDetails { 
    id: number; 
    price: number;
    vat: number; 
    name: string; 
}

// --- API Endpoints ---
const API_URL_PRODUCT_LIST = '/store2/api/v1/product/list';
const API_URL_BASE_PRICE = '/store2/api/v1/price/'; 

// ====================================================================
// Test 1: API and UI data comparison
// ====================================================================

test.describe('Verify product table data matches API response', () => {
    let storePage: StorePage;

    test.beforeEach(async ({ page }) => {
        storePage = new StorePage(page);
        await storePage.goToPage(); 
    });
    
    test('Should verify all product names and prices in the UI table match the API', async ({ request }) => {
        
        // Fetch Product List from API
        const listResponse = await request.get(API_URL_PRODUCT_LIST);
        expect(listResponse.ok()).toBeTruthy();
        const productList: ProductListItem[] = (await listResponse.json()).products || []; 
        
        if (productList.length === 0) { 
            console.warn('API returned an empty product list. Skipping test.'); 
            return; 
        }

        // Fetch Prices for All Products Concurrently
        const pricePromises = productList.map(product => 
            request.get(`${API_URL_BASE_PRICE}${product.id}`).then(r => r.json() as Promise<ProductPriceDetails>)
        );
        const priceResults = await Promise.all(pricePromises);

        // Normalize API Data (This is the EXPECTED result)
        const expectedProducts: ActualProduct[] = productList.map((listProduct, index) => {
            const priceDetails = priceResults[index];
            if (!priceDetails || priceDetails.price === undefined) { 
                throw new Error(`Price details missing for product ID: ${listProduct.id}`); 
            }
            
            const numericPrice = priceDetails.price.toString(); 
            
            return {
                name: listProduct.name.toLowerCase(), 
                price: numericPrice.toString(), 
            };
        });
        
        // Scrape UI Data (This is the ACTUAL result)
        const actualProducts = await storePage.getProductTableData();
        
        // Final Assertion: Compare the two arrays
        expect(actualProducts.length).toBe(expectedProducts.length);
        expect(actualProducts).toEqual(expectedProducts);

        console.log('Product table data successfully verified against API responses.');
    });
});


// ====================================================================
// Test 2: Error Handling when adding to expensive items
// ====================================================================

test.describe('Error Handling', () => {
    
    
    test('Should prevent adding excessive quantity and show an error message', async ({ page }) => {
        // Initialize the page object
        const storePage = new StorePage(page);
        await storePage.goToPage();

        // Define the test data
        const TV_PRODUCT_ID = '10'; 
        const EXCESSIVE_AMOUNT = '50';
        const EXPECTED_ERROR = 'Insufficient funds!';

        // Uses the dedicated method with its internal assertion
        await storePage.attemptAddProductAndExpectError(
            TV_PRODUCT_ID, 
            EXCESSIVE_AMOUNT, 
            EXPECTED_ERROR
        );
    });
});

// --------------------------------------------------------------------

// ====================================================================
// Test 3: Receipt Validation
// ====================================================================

test.describe('Full Purchase and Receipt Validation', () => {
    
    // Verifies the exact HTML output from the user's request
    test('Should complete a purchase of a single item and validate the receipt modal', async ({ page }) => {
        const storePage = new StorePage(page);
        await storePage.goToPage();

        // Define test data
        const PRODUCT_ID = '2'; // Assuming ID '2' is Banana
        const QUANTITY = '1';
        
        const CUSTOMER_NAME = 'Malin';
        const CUSTOMER_ADDRESS = 'Testgatan 1';
        
        const EXPECTED_RECEIPT_ITEMS = '1 x Banana - $23';
        const EXPECTED_TOTAL = '23';
        const EXPECTED_VAT = '4.7';
        const EXPECTED_GRAND_TOTAL = '27.7';

        // Add product to cart
        await storePage.addProductToCart(PRODUCT_ID, QUANTITY);

        // Go to purchase checkout
        await storePage.buyButton.click();
        
        // Confirm purchase details
        await storePage.confirmPurchase(CUSTOMER_NAME, CUSTOMER_ADDRESS);

        // --- Validate Final Receipt Modal Values ---

        // Verify the list of purchased items (the <ul> element's content)
        await expect(storePage.getReceiptItemsLocator()).toHaveText(EXPECTED_RECEIPT_ITEMS);

        // Verify the thank you message
        await expect(storePage.getThankYouMessageLocator()).toContainText(`Thank you for your purchase, ${CUSTOMER_NAME}`);
        
        // Verify the shipping address
        await expect(storePage.getReceiptAddressLocator()).toContainText(`It will be shipped to: ${CUSTOMER_ADDRESS}`);

        // Verify all three numerical totals
        await storePage.validateReceiptTotals(
            EXPECTED_TOTAL, 
            EXPECTED_VAT, 
            EXPECTED_GRAND_TOTAL
        );
        
        console.log('Single-item purchase validated: All receipt details match expected values.');
    });
});

// --------------------------------------------------------------------

// ====================================================================
// Test 4: Accessibility Checks
// ====================================================================

test.describe('Accessibility: Audit', () => {
    
    const AxeBuilder = require('@axe-core/playwright');

    test('Should not have any automatically detectable accessibility issues', async ({ page }) => {
        await page.goto('/store2/'); 

        // Run an accessibility scan on the current page
        const accessibilityScanResults = await new AxeBuilder({ page }).analyze(); 

        // Assert that the violations array is empty (meaning no issues were found)
        expect(accessibilityScanResults.violations).toEqual([]);
    });
});