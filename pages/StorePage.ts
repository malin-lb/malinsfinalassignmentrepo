import { Page, Locator } from '@playwright/test'; 
import { expect } from '@playwright/test';

// This defines the structure for a product's data
export type ActualProduct = {
    name: string;
    price: string; 
};

export class StorePage {
  readonly page: Page;

 
  readonly selectProduct: Locator;
  readonly amountInput: Locator;
  readonly addToCartButton: Locator;
  readonly buyButton: Locator;
  readonly buyMessage: Locator; 
  readonly productRows: Locator; 
  readonly nameInput: Locator;
  readonly addressInput: Locator;
  readonly confirmButton: Locator;
  readonly summaryItem: Locator; 
  readonly thankYouMessage: Locator;
  readonly receiptGrandTotal: Locator;
  readonly receiptItems: Locator;
  readonly receiptTotal: Locator;
  readonly receiptVAT: Locator;
  readonly receiptAddress: Locator;


// The constructor runs when a new StorePage object is created.
  constructor(page: Page) {
    this.page = page;

    this.selectProduct = page.getByTestId('select-product');
    this.amountInput = page.getByRole('textbox', { name: 'Amount' });
    this.addToCartButton = page.getByTestId('add-to-cart-button');
    this.buyButton = page.getByRole('button', { name: 'Buy' });
    this.buyMessage = page.getByTestId('buy-message');
    this.productRows = page.locator('#productList tr'); 
    
    this.nameInput = page.getByRole('textbox', { name: 'Name:' });
    this.addressInput = page.getByRole('textbox', { name: 'Address:' });
    this.confirmButton = page.getByRole('button', { name: 'Confirm Purchase' });
    this.summaryItem = page.getByRole('listitem');
    this.thankYouMessage = page.locator('#name');
    this.receiptGrandTotal = page.getByTestId('receiptGrandTotal');
    
    this.receiptItems = page.locator('#receiptItems');
    this.receiptTotal = page.locator('#receiptTotal');
    this.receiptVAT = page.locator('#receiptVAT');
    this.receiptAddress = page.locator('#address');
  }

// Navigates the browser to the Store Page
  async goToPage(): Promise<void> {
    await this.page.goto('/store2');
  }


// Selects a product, enters an amount, and clicks the 'Add to Cart' button
  async addProductToCart(productId: string, amount: string): Promise<void> {
    await this.selectProduct.selectOption(productId);
    await this.amountInput.fill(amount);
    await this.addToCartButton.click();
  }

// Tries to add a product but expects an error message to appear instead of a success message
  async attemptAddProductAndExpectError(productId: string, amount: string, expectedErrorMessage: string): Promise<void> {
    await this.selectProduct.selectOption(productId);
    await this.amountInput.fill(amount);
    await this.addToCartButton.click();
    await this.buyMessage.waitFor({ state: 'visible' });
    await expect(this.buyMessage).toHaveText(expectedErrorMessage);
  }
  
// Fills in the name and address, clicks 'Confirm Purchase'
  async confirmPurchase(name: string, address: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.addressInput.fill(address);
    await this.confirmButton.click();
  }
  
// Verifies the receipt's subtotal, VAT, and grand total
  async validateReceiptTotals(total: string, vat:string, grandTotal: string): Promise<void> {
      await expect(this.receiptTotal).toHaveText(total);
      await expect(this.receiptVAT).toHaveText(vat);
      await expect(this.receiptGrandTotal).toHaveText(grandTotal);
  }


// --- Assertions ---

  getThankYouMessageLocator(): Locator {
      return this.thankYouMessage;
  }
  
  getReceiptAddressLocator(): Locator {
      return this.receiptAddress;
  }

  getReceiptItemsLocator(): Locator {
      return this.receiptItems;
  }

  getReceiptGrandTotalLocator(): Locator {
      return this.receiptGrandTotal;
  }
  

  // --- Data Scraping Action ---

 //Scrapes the product name and price from the main HTML product list table on the page
  async getProductTableData(): Promise<ActualProduct[]> {
    const rowCount = await this.productRows.count();
    const actualProducts: ActualProduct[] = [];

    for (let i = 0; i < rowCount; i++) {
        const row = this.productRows.nth(i);
        
        const productName = (await row.locator('td').nth(0).innerText()).trim().toLowerCase();
        let productPrice = await row.locator('td').nth(1).innerText();

        productPrice = productPrice.trim().replace(/[^0-9.]/g, ''); 

        actualProducts.push({
            name: productName,
            price: productPrice,
        });
    }

    return actualProducts;
  }
}