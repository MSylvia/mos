/* 
 * File:   Model.cpp
 * Author: morgan
 * 
 * Created on February 25, 2014, 6:40 PM
 */

#include "mesh.hpp"

namespace mo {
    
    unsigned int Mesh::current_id = 0;
    
    Mesh::Mesh() : valid(true){
        id_ = current_id++;        
    }
    
    Mesh::Mesh(const Mesh & mesh): Mesh(mesh.verticesBegin(), mesh.verticesEnd(), mesh.elementsBegin(), mesh.elementsEnd()){        
    }
    
    Mesh::~Mesh() {
    }

    unsigned int Mesh::id() const {
        return id_;
    }
    
    void Mesh::clear() {
        vertices_.clear();
        elements_.clear();
    }
    
    void Mesh::add(const Vertex vertex) {
        vertices_.push_back(vertex);
        valid = false;
    }
    
    void Mesh::add(const int element){
        elements_.push_back(element);
    }
    
    Vertex Mesh::back(){
        return vertices_.back();
    }
    
}