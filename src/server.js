import express from 'express'
import graphqlHTTP from 'express-graphql'
import { buildSchema } from 'graphql'

import schema from './schema'
import Database from './Database'
import DepartmentRepository from './DepartmentRepository'
import GroceryListRepository from './GroceryListRepository'
import ProductRepository from './ProductRepository'
import StoreRepository from './StoreRepository'

const port = process.env.PORT || 3000

const database = new Database()
const departmentRepository = new DepartmentRepository(database)
const productRepository = new ProductRepository(database)
const storeRepository = new StoreRepository(database)
const groceryListRepository = new GroceryListRepository(database)

// The root provides a resolver function for each API endpoint
const root = {
  departments: () => {
    console.log("Processing request: departments")
    return departmentRepository.findAll()
  },

  products: () => {
    console.log("Processing request: products")
    return productRepository.findAll()
  },

  stores: () => {
    console.log("Processing request: stores")
    return storeRepository.findAll()
  },

  groceryLists: () => {
    console.log("Processing request: groceryLists")
    return groceryListRepository.findAll()
  },

  groceryList: (input) => {
    const {storeId} = input
    console.log(`Processing request: groceryList(${storeId})`)
    return groceryListRepository.findByStoreId(storeId)
  },

  addDepartmentToStore: (input) => {
    const {departmentName, storeId} = input
    console.log(`Processing request: addDepartmentToStore('${departmentName}', ${storeId})`)

    return Promise.all([
      storeRepository.findById(storeId).then((s) => {
        // console.log('addDepartmentToStore: found store', s.name)
        return s
      }),
      departmentRepository.findByName(departmentName).then((d) => {
        if (d) {
          // A department with this name already exists, use it
          console.log('addDepartmentToStore: found existing department', d.name)
          return d
        }
        else {
          // Create a new department
          console.log('addDepartmentToStore: creating new department')
          return departmentRepository.create(departmentName)
        }
      })
    ]).then((values) => {
      // console.log('values', values)
      const store = values[0]
      const department = values[1]

      console.log('addDepartmentToStore: store:', store, ', department:', department)

      store.departments.push(department)
      storeRepository.update(store)
      return store
    }).catch((error) => {
      console.log('addDepartmentToStore error:', error)
    })
  },

  updateDepartmentsForStore: (input) => {
      const {departments, storeId} = input
      console.log(`Processing request: updateDepartmentsForStore`)
      return Promise.all([
        storeRepository.findById(storeId).then((s) => {
          // console.log('addDepartmentToStore: found store', s.name)
          return s
        })
      ]).then((values) => {
        // console.log('values', values)
        const store = values[0]
        store.departments = departments
        storeRepository.update(store)
        return store
      }).catch((error) => {
        console.log('updateDepartmentsForStore error:', error)
      })
  },

  addProduct: (input) => {
    const {name, departmentId} = input
    console.log(`Processing request: addProduct('${name}', ${departmentId})`)
    return Promise.all([productRepository.create(name, departmentId)]
      ).then((values) => {
        const product = values[0]
        console.log('addProduct returning:', product)
        return product
      }).catch((error) => {
        console.log('addProduct error:', error)
      })
  },

  addProductToGroceryList: (input) => {
    const {productId, groceryListId} = input
    console.log(`Processing request: addProductToGroceryList('${productId}', ${groceryListId})`)

    return Promise.all([
      groceryListRepository.findById(groceryListId).then((g) => {
        return g
      }),
      productRepository.findById(productId).then((p) => {
        return p
      })
    ]).then((values) => {
      // console.log('values', values)
      const groceryList = values[0]
      const product = values[1]

      console.log('addProductToGroceryList: groceryList:', groceryList, ', product:', product)

      groceryList.products.push(product)
      groceryListRepository.update(groceryList)
      return groceryList
    }).catch((error) => {
      console.log('addProductToGroceryList error:', error)
    })
  },

  removeProductFromGroceryList: (input) => {
    const {productId, groceryListId} = input
    console.log(`Processing request: removeProductFromGroceryList('${productId}', ${groceryListId})`)

    return Promise.all([
      groceryListRepository.findById(groceryListId).then((g) => {
        return g
      }),
      productRepository.findById(productId).then((p) => {
        return p
      })
    ]).then((values) => {
      // console.log('values', values)
      const groceryList = values[0]
      const product = values[1]

      console.log('removeProductFromGroceryList: groceryList:', groceryList, ', product:', product)
      const products = []
      groceryList.products.forEach((p) => {
        if (p.id !== product.id) {
          products.push(p)
        }
      })

      groceryList.products = products
      groceryListRepository.update(groceryList)
      return groceryList
    }).catch((error) => {
      console.log('addProductToGroceryList error:', error)
    })
  },
}

var app = express();
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  formatError: error => ({
    message: error.message,
    locations: error.locations,
    stack: error.stack
  }),
  pretty: true,
  graphiql: true
}))

app.post('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  formatError: error => ({
    message: error.message,
    locations: error.locations,
    stack: error.stack
  }),
  pretty: true,
  graphiql: true
}))

app.listen(port)

console.log(`Running a GraphQL API server at localhost:${port}/graphql`)
