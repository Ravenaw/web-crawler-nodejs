const axios = require("axios");
const cheerio = require("cheerio");
const ftp = require("ftp");

const Database = require("better-sqlite3");
const product_db = new Database("products.db", { verbose: console.log });

// create table
product_db.exec(
  "CREATE TABLE IF NOT EXISTS products ( \
  id INTEGER PRIMARY KEY, \
  product_name TEXT, \
  product_sub_title TEXT, \
  product_description TEXT, \
  main_category TEXT, \
  sub_category TEXT, \
  price DOUBLE, \
  link TEXT, \
  overall_rating DOUBLE \
)"
);

product_db.exec(
  "CREATE TABLE IF NOT EXISTS product_images ( \
  product_id INTEGER PRIMARY KEY, \
  image_url TEXT, \
  alt_text TEXT, \
  additional_info TEXT \
)"
);

async function main(maxPages = 10) {
  // initialized with the first webpage to visit
  const mainURL = "https://www.proshop.dk";
  const paginationURLsToVisit = [
    mainURL + "/baerbar",
    mainURL + "/mobil",
    mainURL + "/tablet",
    mainURL + "/Fladskaerms-TV",
    mainURL + "/Baerbare-Festhoejttaler",
    mainURL + "/Hjemmebio",
  ];
  const visitedURLs = [];

  const productURLs = new Set();
  const products = [];

  // iterating until the queue is empty
  // or the iteration limit is hit
  while (paginationURLsToVisit.length != 0) {
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
  for (const productURL of productURLs) {
    const pageHTML = await axios.get(productURL);
    const $ = cheerio.load(pageHTML.data);
    var product = {
      product_name: $('h1[data-type="product"]').text(),
      product_description: $(
        'p[class="site-product-short-description"]'
      ).text(),
      main_category: $(".breadcrumb li:nth-child(2)").text(),
      sub_category: $(".breadcrumb li:nth-child(3)").text(),
      price: $(".site-currency-attention").text().trimEnd(" kr."),
      link: productURL,
      image_url: $(".h-auto").attr("src"),
    };
    products.push(product);
  }
  console.log(products[0]);

  // insert data
  for (const product of products) {
    // insert product
    product_db
      .prepare(
        "INSERT INTO products (product_name, product_description, main_category, sub_category, price, link) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(
        product.product_name,
        product.product_description,
        product.main_category,
        product.sub_category,
        product.price,
        product.link
      );

    // insert product image
    product_db
      .prepare(
        "INSERT INTO product_images (product_id, image_url) VALUES (?, ?)"
      )
      .run(product_db.lastInsertRowid, mainURL + product.image_url);
  }

  // close the database connection
  product_db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Close the database connection.");
  });

  // create ftp connection
  
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
