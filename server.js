const axios = require("axios");
const cheerio = require("cheerio");

//Product schema
class Product {
    constructor(product_name, product_description, main_category, sub_category, price, link, image_url) {
        this.product_name = product_name;
        this.product_description = product_description;
        this.main_category = main_category;
        this.sub_category = sub_category;
        this.price = price;
        this.link = link;
        this.image_url = image_url;
    }
}

async function main(maxPages = 10) {
    // initialized with the first webpage to visit
    const mainURL = "https://www.proshop.dk";
    const paginationURLsToVisit = ["https://www.proshop.dk/baerbar", "https://www.proshop.dk/mobil"];
    const visitedURLs = [];

    const productURLs = new Set();

    const products = [];

    // iterating until the queue is empty
    // or the iteration limit is hit
    while (
        paginationURLsToVisit.length !== 0
    ) {
        // the current webpage to crawl
        const paginationURL = paginationURLsToVisit.pop();

        // retrieving the HTML content from paginationURL
        const pageHTML = await axios.get(paginationURL);

        // adding the current webpage to the
        // web pages already crawled
        visitedURLs.push(paginationURL);

        // initializing cheerio on the current webpage
        const $ = cheerio.load(pageHTML.data);

        // retrieving the pagination URLs
        $(".pagination a").each((index, element) => {
            const paginationURL = mainURL + $(element).attr("href");

            // adding the pagination URL to the queue
            // of web pages to crawl, if it wasn't yet crawled
            if (
                !visitedURLs.includes(paginationURL) &&
                !paginationURLsToVisit.includes(paginationURL)
            ) {
                paginationURLsToVisit.push(paginationURL);
            }
        });

        // retrieving the product URLs
        $("li.toggle a.site-product-link").each((index, element) => {
            const productURL = mainURL + $(element).attr("href");
            productURLs.add(productURL);
        });
    }

    // logging the crawling results
    //console.log([...productURLs]);

    // use productURLs for scraping purposes...
    productURLs.forEach(async (productURL) => {
        const pageHTML = await axios.get(productURL);
        const $ = cheerio.load(pageHTML.data);
        const product= new Product({
            product_name: $(".hidden-xs li").text(),
            product_description: $(".site-product-short-description").text(),
            main_category: $(".breadcrumb li:nth-child(2)").text(),
            sub_category: $(".breadcrumb li:nth-child(3)").text(),
            price: $(".site-currency-attention").text(),
            link: productURL,
            image_url: $(".h-auto").attr("src")
        });
        console.log($(".site-stock-text div").text());
        products.push(product);
    });
}

main()
    .then(() => {
        process.exit(0);
    })
    .catch((e) => {
        // logging the error message
        console.error(e);

        process.exit(1);
    });
