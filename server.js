const axios = require("axios");
const cheerio = require("cheerio");
const sqlite3 = require("sqlite3").verbose();
const ftp = require("ftp");

//Product schema
class Product {
  constructor(
    product_name,
    product_description,
    main_category,
    sub_category,
    price,
    link,
    image_url
  ) {
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
  const paginationURLsToVisit = [
    "https://www.proshop.dk/baerbar",
    "https://www.proshop.dk/mobil",
    "https://www.proshop.dk/tablet",
    "https://www.proshop.dk/Fladskaerms-TV",
    "https://www.proshop.dk/Baerbare-Festhoejttaler",
    "https://www.proshop.dk/Hjemmebio"
  ];
  const visitedURLs = [];

  const productURLs = new Set();
  const products = [];

  // iterating until the queue is empty
  // or the iteration limit is hit
  while (paginationURLsToVisit.length !== 0) {
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
    const product = new Product({
      product_name: $(".hidden-xs").text(),
      product_description: $(".site-product-short-description").text(),
      main_category: $(".breadcrumb li:nth-child(2)").text(),
      sub_category: $(".breadcrumb li:nth-child(3)").text(),
      price: $(".site-currency-attention").text().trimEnd(" kr."),
      link: productURL,
      image_url: $(".h-auto").attr("src"),
    });
    products.push(product);
  }
  console.log(products[0]);

  // create database
  const product_db = new sqlite3.Database("products.db", (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Connected to the in-memory SQlite database.");
  });

  // create table
  product_db.run("DROP TABLE products, product_images");

  product_db.run(
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

  product_db.run(
    "CREATE TABLE IF NOT EXISTS product_images ( \
        product_id INTEGER PRIMARY KEY, \
        image_url TEXT, \
        alt_text TEXT, \
        additional_info TEXT \
      )"
  );

  // insert data
  for (const product of products) {
    // insert product
    product_db.run(
      "INSERT INTO products (product_name, product_description, main_category, sub_category, price, link) VALUES (?, ?, ?, ?, ?, ?)",
      [
        product.product_name,
        product.product_description,
        product.main_category,
        products.sub_category,
        products.price,
        products.link,
      ],
      function (err) {
        if (err) {
          return console.log(err.message);
        }
        console.log(`A row has been inserted with rowid ${this.lastID}`);
      }
    );

    // insert product image
    product_db.run(
      "INSERT INTO product_id, image_url VALUES (?, ?)",
      [
        products_db.run("SELECT id FROM products WHERE product_name=?", [
          product.product_name,
        ]),
        product.image_url,
      ],
      function (err) {
        if (err) {
          return console.log(err.message);
        }
        console.log(`A row has been inserted with rowid ${this.lastID}`);
      }
    );
  }

  // close the database connection
  product_db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Close the database connection.");
  });

  // create ftp connection
  const ftpClient = new ftp();

  // send data to ftp
  ftpClient.on("ready", function () {
    ftpClient.put("products.db", "products.db", function (err) {
      if (err) throw err;
      ftpClient.end();
    });
  });

  // connect to ftp
  ftpClient.connect({
    host: "",
    user: "",
    password: "",
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
