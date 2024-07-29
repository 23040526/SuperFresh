const express = require('express');
const mysql = require('mysql2');
const app = express();
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req,file,cb) => {
      cb(null, 'public/images');
  },
  filename: (req,file, cb) => {
      cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage});
app.use(express.static('public/images')); 

// Create MySQL connection
const connection = mysql.createConnection({
host: 'sql.freedb.tech',
user: 'freedb_superfresh_user',
password: 'm%$8QN5FU9hyRhj',
database: 'freedb_superfresh_db'
});

// connect to sql server
connection.connect((err) => {
if (err) {
console.error('Error connecting to MySQL:', err);
return;
}
console.log('Connected to MySQL database');
});


// Set up view engine
app.set('view engine', 'ejs');
// enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded ({
    extended: true
}));


//render home
app.get('/home', (req,res) => {
    res.render('home');
});

// render about page
app.get('/', (req,res) => {
    res.render('about');
});

//render Login
app.get('/login', (req,res) => {
    res.render('login');
});

//render password recovery website
app.get('/forgotpass', (req,res) => {
  res.render('forgotpass');
});

// Render signup page
app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// Handle signup form submission
app.post('/signup', (req, res) => {
  const { email, password, check } = req.body;
  const staff = 0;

  // Check if passwords match
  if (password !== check) {
    console.log(password, check);
    return res.render('signup', { error: 'Passwords do not match' });
  }

  const dupeacc = email;
  connection.query('SELECT * FROM accounts WHERE email = ?', [dupeacc], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Database error.');
    }

    if (results.length > 0) {
      // Render 'signup' with error message
      res.render('signup', { error: 'Account already exists' });
    } else {
      const sql = 'INSERT INTO accounts (email, password, staff) VALUES (?, ?, ?)';
      connection.query(sql, [email, password, staff], (error, result) => {
        if (error) {
          console.log(error, staff, email, password);
          return res.status(500).send('Database error.');
        }
        res.redirect('/signup?Success=true');
      });
    }
  });
});

// render login page and route staff/customers to appropriate pages
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = `SELECT * FROM accounts WHERE email = ? AND password = ?`;
    connection.query(sql, [email, password], (error, results) => {
      if (error) {
        res.status(500).send('Error logging in');
        
      } 
      
      if (results.length > 0) {
        const user = results[0];
        if (user.staff === 1) {
          // Redirect to inventory page
          res.redirect('/inventory');
        } else {
          // Redirect to home page
          res.redirect('/home');
        }
      } else {
        res.redirect('/login?loginFailed=true');
      }
    });
});


// render inventory with products
app.get('/inventory', (req,res) => { 
  const sql = 'SELECT * FROM products';
   //fetch data from Mysql
   connection.query( sql, (error,results) => {
      if (error) {
          console.error('Database query error:', error.message);
          return res.status(500).send('Error Retreiving products')  
      }
     //render HTML page with data
     res.render('inventory',{ products:results});
  });
});


//render product info in embed 
app.get('/InvInfo/:id', (req,res) => {
    
  const id = req.params.id;
  const sql = 'SELECT * FROM products WHERE id = ?';

  connection.query( sql ,[id],(error, results) => {
      if(error) {
          // render error code if the website retrieves one from the database
          console.error('Database query error:', error.message);
          return res.status(500).send('Error Retrieving product ID');
      
      }

      if (results.length > 0) {
        // check if there is a product with the given ID
        res.render('InvInfo',{product: results[0] });
      }

      else {
        // render error code when no product is found
        res.status(404).send('Product not found')
      }
  });
})

// render add product page
app.get('/addProduct', (req,res) => {
  res.render('addProduct',{error:null});
});


app.post('/addProduct', upload.single('image'), (req, res) => {
  const { name, type, price, quantity, notes } = req.body;
  const dupename = name.toLowerCase();

  connection.query('SELECT * FROM products WHERE name = ?', [dupename], (err, results) => {
    if (err) {
      console.error('Error from database:', err);
      res.status(500).send('Error from database');
      return;
    }

    if (results.length > 0) {
      // Render 'addProduct' with error message
      res.render('addProduct', { error: 'Product already exists' });
      return;
    }

    let image;
    if (req.file) {
      image = req.file.filename;
    } else {
      image = null;
    }
    
    const notesValue = notes || 'none';
    const sql = 'INSERT INTO products (name, type, price, quantity, notes, image) VALUES (?, ?, ?, ?, ?, ?)';

    connection.query(sql, [name, type, price, quantity, notesValue, image], (error, results) => {
      if (error) {
        console.error('Error adding product:', error);
        res.status(500).send('Error adding product');
      } else {
        res.redirect('/inventory');
      }
    });
  });
});

//render edit product page
app.get('/editProduct/:id', (req,res) => {
    
  const id = req.params.id;
  const sql = 'SELECT * FROM products WHERE id = ?';

  connection.query( sql ,[id],(error, results) => {
      if(error) {
          // render error code if the website retrieves one from the database
          console.error('Database query error:', error.message);
          return res.status(500).send('Error Retrieving product by ID');
      
      }
        
      if (results.length > 0) {
        // check if there is a product with the given ID
        res.render('editProduct',{product: results[0] });
      }

      else {
        // render error code when no product is found
        res.status(404).send('Product not found')
      }
  });
})

//edit product logic
app.post('/editProduct/:id',upload.single('image'),(req,res) => {
  
  const id = req.params.id
  const {name, type, price, quantity, notes} = req.body

  const notesValue = notes || "none";

  
  let image = req.body.currentImage;
    if (req.file) {
        image = req.file.filename;
    }
  const sql = 'UPDATE products SET name = ? ,type = ? ,price = ?, quantity = ?, notes = ?, image = ? WHERE id = ?';

  connection.query( sql ,[name, type, price, quantity, notesValue, image, id], (error,results) => {
      // Sends Error if issues occur during database operation
      if (error) {
          console.error("Error Updating product:", error);
          res.status(500).send('Error Updating product');
      } //redirect to inventory uppon successful process
          else {
          res.redirect('/inventory')
      }

  });
});

// Render Searchbar for Inv management
app.get('/Search_inv', (req,res) => {
  res.render('Search_inv');
});

app.post('/Search_inv', (req, res) => {
  const searchQuery = req.body.searchResult;

  // Check if the searchQuery is a number
  const isNumber = !isNaN(searchQuery);

  let sql;
  if (isNumber) {
    // SQL query to search for products by ID
    sql = `SELECT * FROM products WHERE id = ${searchQuery}`;
  } else {
    // SQL query to search for products by name (using LIKE for partial match/case insensitivity)
    sql = `SELECT * FROM products WHERE name LIKE '%${searchQuery}%'`;
  }

  connection.query(sql, (error, results) => {
    if (error) {
      console.error('Error searching products:', error);
      res.status(500).send('Error searching products');
      
    } else {
      if (results.length > 0) {
        // Render ProductInfo view with the search results
        res.render('InvInfo', { product: results[0] });
      } else {
        // No results found
        res.render('Search_inv', { error: "No results found" });
      }
    }
  });
});



//search Menu for customers
app.get('/Search_products', (req,res) => {
  res.render('Search_products',{error:null});
});

app.post('/Search_products', (req, res) => {
  const searchQuery = req.body.searchResult;
  
  if (searchQuery) {

    let sql = "SELECT * FROM products WHERE name LIKE ?";
    connection.query(sql, [`%${searchQuery}%`], (error, results) => {
      
      if (error) {
        console.error('Error searching products:', error);
        res.status(500).send('Error searching products');
      } else {

        if (results.length > 0) {
          // Render PartInfo view with the search results
          res.render('ProductInfo', { product: results[0] });

        } else {
          // No results found
          res.render('Search_products',{error: "no results found"});
        }
      }
    });
  } else {
    res.status(400).send('Invalid search query');
  }
});

// render Preview Menu 
app.get('/preview', (req,res) => { 
  const sql = 'SELECT * FROM products';
   //fetch data from Mysql
   connection.query( sql, (error,results) => {
      if (error) {
          console.error('Database query error:', error.message);
          return res.status(500).send('Error Retreiving products')  
      }
     //render HTML page with data
     res.render('preview',{ products:results});
  });
});

// render all Menu 
app.get('/all', (req,res) => { 
  const sql = 'SELECT * FROM products';
   //fetch data from Mysql
   connection.query( sql, (error,results) => {
      if (error) {
          console.error('Database query error:', error.message);
          return res.status(500).send('Error Retreiving products')  
      }
     //render HTML page with data
     res.render('all',{ products:results});
  });
});

// render dairy Menu 
app.get('/dairy', (req,res) => { 
  const sql = 'SELECT * FROM products';
   //fetch data from Mysql
   connection.query( sql, (error,results) => {
      if (error) {
          console.error('Database query error:', error.message);
          return res.status(500).send('Error Retreiving products')  
      }
     //render HTML page with data
     res.render('dairy',{ products:results});
  });
});

//render fruits and vegs Menu
app.get('/fruitsvegs', (req,res) => { 
  const sql = 'SELECT * FROM products';
   //fetch data from Mysql
   connection.query( sql, (error,results) => {
      if (error) {
          console.error('Database query error:', error.message);
          return res.status(500).send('Error Retreiving products')  
      }
     //render HTML page with data
     res.render('fruitsvegs',{ products:results});
  });
});

//render Seafood and meats
app.get('/meatsea', (req,res) => { 
  const sql = 'SELECT * FROM products';
   //fetch data from Mysql
   connection.query( sql, (error,results) => {
      if (error) {
          console.error('Database query error:', error.message);
          return res.status(500).send('Error Retreiving products')  
      }
     //render HTML page with data
     res.render('meatsea',{ products:results});
  });
});

//render household Menu
app.get('/household', (req,res) => { 
  const sql = 'SELECT * FROM products';
   //fetch data from Mysql
   connection.query( sql, (error,results) => {
      if (error) {
          console.error('Database query error:', error.message);
          return res.status(500).send('Error Retreiving products')  
      }
     //render HTML page with data
     res.render('household',{ products:results});
  });
});

//delete product logic
app.get('/deleteProduct/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM products WHERE id = ?';

  connection.query(sql, [id], (error, results) => {
      if (error) {
          console.error("Error deleting product:", error);
          res.status(500).send('Error deleting product');
      } else {
          res.redirect('/inventory');
      }
  });
});


