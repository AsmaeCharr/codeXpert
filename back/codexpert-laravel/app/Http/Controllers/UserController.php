<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use App\Models\User;

class UserController extends Controller
{
    public function getAvatar(Request $request)
    {
        //Check if the user id is null, if not not we get the user's avatar.
        if ($request -> session()->get('userId') != null) {
            $userFound = User::where('id', $request->session()->get('userId'))->first();
            $returnAvatar = (object) ['url' => $userFound -> avatar];
        } else {
            $returnAvatar = (object) ['url' => null];
        }
        
        return response() -> json($returnAvatar);
    }
    

    public function setAvatar(Request $request)
    {
        //Check if the user is id null, if not we change the avatar.
        if ($request -> session()->get('userId') != null) {
            $userFound = User::where('id', $request->session()->get('userId'))->first();
            $userFound -> avatar = $request -> newAvatar;
            $userFound -> save();
            $returnResponse = (object) ['changed' => true];
        } else {
            $returnResponse = (object) ['changed' => null];
        }  
        return response() -> json($returnResponse);
    }


    public function getRanking(Request $request)
    {
        //Return the list of users ordered by their elo.
        $ranking = User::orderBy('elo', 'DESC')->get();

        return response() -> json($ranking);
    }    
    

    public function getUserData(Request $request)
    {
        //If the user id is not null we return the information from the user (name, email, avatar)
        if ($request -> session()->get('userId') != null) {
            $userFound = User::where('id', $request->session()->get('userId'))->first();
            $returnUser = (object) ['name' => $userFound -> name,
                                    'email' => $userFound -> email,
                                    'avatar' => $userFound -> avatar,
                                    ];
        } else {
            $returnUser = (object) ['error' => "User is not logged in."];
        }
        
        return response() -> json($returnUser);
    }


    public function checkValidName($request, $userFound)
    {
        $nameRepeated = false;
        $validName = (object) ['willChange' => true];
       
        //Check if user has changed the name                      
        if ($request -> session()->get('userId') != null) {
            if ($userFound -> name == $request -> newName) {
                $validName = (object) ['willChange' => false, 'error' => "Name has not been modified, no changes were made."];  
            } else {
                //If the name has been modified, we check that is valid.
                if (( strlen ($request -> newName) < 3) || ( strlen($request -> newName) > 20)) {
                    $validName = (object) ['willChange' => false, 'error' => "Name must have a minimum amount of 3 characters and 20 max."];
                } else {
                    //If the name is valid we check if it's not repeated.
                    $getAllNames = User::get('name');
                    for ($i = 0; $i < count($getAllNames); $i++) { 
                        if ($request -> newName == $getAllNames[$i]) {
                            $nameRepeated = true;
                        }
                    }
                    //Check if the name is repeated.
                    if ($nameRepeated) {
                        $validName = (object) ['willChange' => false,
                        'error' => "Name already in use."]; 
                    } else {
                        $validName = (object) ['willChange' => true];
                    }
                }
            }
            
        } 
        return $validName;
    }
    

    public function setUsername(Request $request)
    {
        $validName = (object) ['willChange' => true];

        //Check if the user id is not, if not null we continue to check
        if ($request -> session()->get('userId') != null) {
            $userFound = User::where('id', $request->session()->get('userId'))->first();
            $validName = $this->checkValidName($request, $userFound);

            //If after validating the name can be changed we change it, if not we return the error.
            if ($validName -> willChange) {
                $userFound -> name = $request -> newName;
                $userFound -> save(); 
                $returnUser = (object) ['success' => "Name has been changed."];
            } else {
                $returnUser = (object) ['error' => $validName -> error];
            }
        } else {
            $returnUser = (object) ['error' => "User is not logged in."];
        }
        
        return response() -> json($returnUser);
    }
}